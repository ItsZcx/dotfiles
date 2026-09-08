import * as fs from "node:fs";
import * as path from "node:path";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { convertToLlm, getMarkdownTheme, serializeConversation } from "@earendil-works/pi-coding-agent";
import { Input, Key, Markdown, matchesKey, truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";

/**
 * /btw — one persistent, session-like chat screen against a cheap side-model.
 *
 * Your main model (DeepSeek) quietly accumulates a huge window (100k+ tokens).
 * This opens a dedicated "btw" conversation that:
 *   - targets google/gemini-3.5-flash-lite (cheap/free), so ZERO paid DeepSeek
 *     tokens are ever spent;
 *   - is fully isolated from your DeepSeek session — it never routes through the
 *     agent loop, never grows DeepSeek's context, never writes to its session
 *     file, and is discarded when btw is left;
 *   - keeps the whole conversation on screen at once (session-style), with your
 *     compose line pinned at the bottom.
 *
 * Leave by pressing Esc or by typing `/quit` (like pi). Either drops you back
 * into DeepSeek exactly where you were.
 *
 * Slash-prefixed commands typed at the prompt (only in btw's own chat, matching pi):
 *   /quit                    Leave btw (same as Esc).
 *   /help, /?                List commands.
 *   /context [on|off|N]      Include ~N tokens of recent DeepSeek convo as
 *                            grounding (off = stateless, on ~ 8k, cap 24k).
 *   /read  <path>            Load a workspace file into the grounding.
 *   /ls [dir]  /tree [dir]   Load a folder listing into the grounding.
 *   /clear                   Forget this btw transcript.
 *   Anything else            A question to gemini.
 */

const PROVIDER = "google";
const MODEL = "gemini-3.5-flash-lite";
const TITLE = `btw · ${PROVIDER}/${MODEL}`;

const MAX_GROUND_TAIL_TOKENS = 24_000;
const DEFAULT_GROUND_TAIL = 8000;
const MAX_MEMORY_CHARS = 24_000;
const MAX_FILE_CHARS = 40_000;
const MAX_TREE_ENTRIES = 600;

const SYS_PROMPT =
	"You are a concise, no-fluff assistant in a coding chat. Answer directly with short " +
	"code snippets and 3-8 sentence answers. If given file contents or a recent " +
	"conversation tail as grounding, use it. Do not echo the question.";

type MemLine = { kind: "q" | "a"; text: string };

const estTokens = (t: string): number => Math.ceil(t.length / 4);

class Mode {
	history: MemLine[] = [];
	ground: string[] = [];
	tailTokens = 0;

	noteQ(q: string): void {
		this._push("q", q);
	}
	noteA(a: string): void {
		this._push("a", a);
	}
	setNote(text: string): void {
		// transient one-off informational line; dropped on next real turn
		this._push("note", text);
	}
	privHistoryToLines(): MemLine[] {
		return this.history;
	}
	clear(): void {
		this.history = [];
	}
	transcript(): string {
		return this.history
			.filter((l) => l.kind !== "note")
			.map((l) => (l.kind === "q" ? `User: ${l.text}` : `Assistant: ${l.text}`))
			.join("\n\n");
	}
	private _push(kind: MemLine["kind"], text: string): void {
		const real = kind === "note";
		this.history.push({ kind: real ? "note" : kind, text });
		let total = 0;
		for (const l of this.history) total += l.text.length;
		while (total > MAX_MEMORY_CHARS && this.history.length > 2) {
			total -= this.history[0].text.length;
			this.history.shift();
		}
	}
}

// ---------------------------------------------------------------------------
// Workspace reads (relative to the DeepSeek session's cwd).
// ---------------------------------------------------------------------------
function sessionCwd(ctx: ExtensionCommandContext): string {
	return ctx.sessionManager.getCwd() ?? process.cwd();
}

function readIntoGround(ctx: ExtensionCommandContext, rel: string, m: Mode): void {
	try {
		const abs = path.resolve(sessionCwd(ctx), rel);
		if (!fs.statSync(abs).isFile()) throw new Error(`not a file: ${rel}`);
		let raw = fs.readFileSync(abs, "utf8").slice(0, MAX_FILE_CHARS);
		if (raw.length === MAX_FILE_CHARS) raw += "\n…[truncated]";
		m.ground.push(`===== file: ${rel} =====\n${raw}\n===== end =====`);
		m.noteQ(`✓ loaded ${rel}`);
	} catch (err) {
		m.noteQ(`✗ read failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}

function listIntoGround(ctx: ExtensionCommandContext, dir: string, m: Mode, recursive: boolean): void {
	try {
		const base = path.resolve(sessionCwd(ctx), dir || ".");
		if (!fs.statSync(base).isDirectory()) throw new Error(`not a directory: ${dir || "."}`);
		const out: string[] = [];
		const walk = (cur: string, depth: number): void => {
			if (out.length >= MAX_TREE_ENTRIES) return;
			let kids: string[];
			try {
				kids = fs.readdirSync(cur).sort();
			} catch {
				return;
			}
			for (const k of kids) {
				if (out.length >= MAX_TREE_ENTRIES) return;
				if (k.startsWith(".")) continue;
				let isDir = false;
				try {
					isDir = fs.statSync(path.join(cur, k)).isDirectory();
				} catch { /* ignore */ }
				out.push(`${"  ".repeat(depth)}${k}${isDir ? "/" : ""}`);
				if (recursive && isDir) walk(path.join(cur, k), depth + 1);
			}
		};
		walk(base, 0);
		m.ground.push(
			`===== folder: ${path.relative(sessionCwd(ctx), base) || "."}${recursive ? " (recursive)" : ""} =====\n` +
				out.join("\n"),
		);
		m.noteQ(`✓ listed ${out.length} entries`);
	} catch (err) {
		m.noteQ(`✗ list failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}

// ---------------------------------------------------------------------------
// Bounded DeepSeek-convo tail (grounding when context is enabled).
// ---------------------------------------------------------------------------
function deepseekTail(ctx: ExtensionCommandContext, maxTokens: number): string {
	if (maxTokens <= 0) return "";
	const branch = ctx.sessionManager.getBranch();
	const msgs: AgentMessage[] = [];
	const LIMIT = 40;
	for (let i = branch.length - 1; i >= 0 && msgs.length < LIMIT; i--) {
		const e = branch[i] as { type?: string; message?: AgentMessage } | undefined;
		if (e?.type === "message" && e.message?.role && "content" in e.message) msgs.unshift(e.message);
	}
	if (msgs.length === 0) return "";
	const text = serializeConversation(convertToLlm(msgs));
	if (estTokens(text) <= maxTokens) return text;
	return "…(older DeepSeek convo trimmed)…\n" + text.slice(Math.max(0, text.length - maxTokens * 4));
}

function buildPrompt(q: string, m: Mode, ctx: ExtensionCommandContext): string {
	const parts = [SYS_PROMPT];
	if (m.tailTokens > 0) {
		const tail = deepseekTail(ctx, m.tailTokens);
		if (tail) parts.push(`Tail of DeepSeek convo (newest at bottom):\n<deepseekRecent>\n${tail}\n</deepseekRecent>`);
	}
	if (m.ground.length > 0) parts.push(`Files/folders the user loaded:\n${m.ground.join("\n")}`);
	const wm = m.transcript();
	if (wm) parts.push(`Our btw chat so far:\n${wm}`);
	parts.push(`User's question: ${q}`);
	return parts.join("\n\n");
}

async function askGemini(q: string, m: Mode, model: unknown, ctx: ExtensionCommandContext): Promise<string> {
	const prompt = buildPrompt(q, m, ctx);
	let resp;
	try {
		resp = await ctx.modelRegistry.complete(
			model as never,
			{
				messages: [
					{
						role: "user",
						content: [{ type: "text", text: prompt }],
						timestamp: Date.now(),
					},
				],
			},
			{ cacheRetention: "none" },
		);
	} catch (err) {
		return `⚠ error: ${err instanceof Error ? err.message : String(err)}`;
	}
	return (
		resp?.content
			?.filter((c): c is { type: "text"; text: string } => c?.type === "text")
			.map((c) => c.text ?? "")
			.join("\n")
			.trim() || "(no textual response)"
	);
}

// ---------------------------------------------------------------------------
// Command wiring — the single persistent overlay.
// ---------------------------------------------------------------------------
export default function (pi: ExtensionAPI) {
	pi.registerCommand("btw", {
		description: `Session-like chat with google/${MODEL} until you leave. /quit or Esc exits.`,
		handler: async (args, ctx) => {
			if (ctx.mode !== "tui" || !ctx.hasUI) {
				ctx.ui.notify("btw needs the interactive TUI.", "error");
				return;
			}
			const model = ctx.modelRegistry.find(PROVIDER, MODEL);
			if (!model) {
				ctx.ui.notify(`Cannot start /btw: ${PROVIDER}/${MODEL} not found.`, "error");
				return;
			}
			if (!ctx.modelRegistry.hasConfiguredAuth(model)) {
				ctx.ui.notify(`Cannot start /btw: no auth for ${PROVIDER}/${MODEL}. Run /login.`, "error");
				return;
			}

			const mem = new Mode();
			const seed = (args || "").trim();

			await ctx.ui.custom((tui, theme, _kb, done) => {
				const input = new Input({ prompt: theme.fg("accent", "> ") });
				input.focused = true;

				// Renderable flags.
				let busy = false;
				let controller: AbortController | undefined;
				let statusLine = "";

				// Arrow-key history over your sent messages. `histCursor` is the index in
				// `sentHistory`; when it equals length we're at the live (unsent) draft.
				const sentHistory: string[] = [];
				let histCursor = 0;
				let savedDraft = "";

				// Manual transcript viewport (Option A in-panel scroll). The compose bar stays
				// pinned at the bottom; the transcript above is a scrolled window.
				let anchored = true; // when true we keep following the newest message
				let prevTop = 0; // last drawn first-visible transcript line
				

				const refresh = (): void => {
					tui.requestRender();
				};

				// Handle a submitted command/question after an answer resolves.
				const dispatchCmd = (raw: string): void => {
					const c = raw.trim();
					const low = c.toLowerCase();
					if (!c) return;

					// /quit leaves btw (like pi). Esc also leaves.
					if (low === "/quit") {
						stop();
						return;
					}

					// Slash-prefixed commands. Everything else is a plain question to gemini.
					if (low === "/help" || low === "/?") {
						mem.setNote(
							"/quit - leave btw (Esc works too)\n" +
							"commands: /help /clear /context [on]|[off]|[N] /read <file> /file <file> /ls [dir] /tree [dir]\n" +
							"↑/↓ recall your messages · any other text is asked to gemini",
						);
						refresh();
						return;
					}
					if (low.startsWith("/context")) {
						const arg = low.replace(/^\/context\s*/, "").trim();
						if (arg === "on") mem.tailTokens = DEFAULT_GROUND_TAIL;
						else if (arg === "off" || arg === "") mem.tailTokens = 0;
						else {
							const n = parseInt(arg, 10);
							mem.tailTokens = Number.isFinite(n)
								? Math.max(0, Math.min(MAX_GROUND_TAIL_TOKENS, n))
								: mem.tailTokens;
						}
						mem.setNote(
							mem.tailTokens > 0
								? `context on: including up to ~${mem.tailTokens} DeepSeek-convo tokens.`
								: "context off: stateless again.",
						);
						refresh();
						return;
					}
					if (low.startsWith("/read ") || low.startsWith("/file ")) {
						readIntoGround(ctx, c.slice(c.indexOf(" ") + 1).trim(), mem);
						refresh();
						return;
					}
					if (low === "/ls" || low.startsWith("/ls ")) {
						listIntoGround(ctx, c.slice(3).trim(), mem, false);
						refresh();
						return;
					}
					if (low === "/tree" || low.startsWith("/tree ")) {
						listIntoGround(ctx, c.slice(5).trim(), mem, true);
						refresh();
						return;
					}
					if (low === "/clear") {
						mem.clear();
						refresh();
						return;
					}

					// Otherwise it's a question.
					runAsk(c);
				};

				const stop = (): void => {
					try {
						controller?.abort();
					} catch { /* ignore */ }
					done(undefined);
				};

				const runAsk = (q: string): void => {
					if (busy) return;
					busy = true;
					anchored = true; // a fresh turn returns to following the newest content
					controller = new AbortController();
					const sig = controller.signal;
					mem.noteQ(q);
					statusLine = "… btw is thinking …";
					input.setValue("");
					refresh();

					void (async () => {
						let out = "";
						try {
							out = await askGemini(q, mem, model, ctx);
						} catch (err) {
							out = `⚠ error: ${err instanceof Error ? err.message : String(err)}`;
						}
						if (sig.aborted) {
							busy = false;
							statusLine = "";
							return;
						}
						mem.noteA(out);
						busy = false;
						statusLine = "";
						refresh();
					})();
				};

				input.onSubmit = (value: string): void => {
					const trimmed = value.trim();
					// Remember plain prompts for ↑/↓ recall; skip slash-commands and quiet exits.
					if (trimmed && !trimmed.startsWith("/")) {
						const low = trimmed.toLowerCase();
						if (low !== "quit" && low !== "exit" && low !== "q") {
							if (sentHistory[sentHistory.length - 1] !== trimmed) sentHistory.push(trimmed);
						}
					}
					histCursor = sentHistory.length;
					savedDraft = "";
					dispatchCmd(value);
				};
				input.onEscape = (): void => {
					// While waiting on a long generation, an Esc cancels the ask.
					if (busy) {
						try {
							controller?.abort();
						} catch { /* ignore */ }
					}
					stop();
				};

				// Inline seed: an argument to /btw is asked as the first question, unless it
				// itself looks like a slash-command (then refrain; type it inside the chat).
				if (seed) {
					if (!seed.startsWith("/")) {
						if (!(seed.toLowerCase().trim() === "quit" || seed.toLowerCase().trim() === "exit")) runAsk(seed.trim());
					}
				}
				refresh();

				// Build the full transcript display list. Each participant's handle occupies its
				// OWN line; the message body then uses the FULL width underneath (no gutter indent).
				// Model replies are rendered as rich Markdown; your own prompts stay plain.
				const mdTheme = getMarkdownTheme();
				const buildContent = (w: number): string[] => {
					const bodyW = Math.max(16, w); // full width for body text
					const out: string[] = [];

					const mine = (text: string): void => {
						for (const ln of wrapTextWithAnsi(text, bodyW)) out.push(ln);
					};
					const gem = (markdown: string): void => {
						// A fresh Markdown per message; render at full width. Long code lines are
						// later caught by the outer width safety net.
						const lines = new Markdown(markdown, 0, 0, mdTheme).render(bodyW);
						for (const ln of lines) out.push(ln);
					};
					const note = (text: string): void => {
						out.push(theme.fg("muted", text));
					};

					let first = true;
					for (const l of mem.history) {
						if (!first) out.push(""); // spacing between messages
						first = false;

						if (l.kind === "q") {
							out.push(theme.bold(theme.fg("accent", "you ▸")));
							mine(l.text);
						} else if (l.kind === "a") {
							out.push(theme.bold(theme.fg("success", "gemini ▸")));
							gem(l.text);
						} else {
							note(l.text);
						}
					}
					return out;
				};
				// Rebuild heavy Markdown only when the transcript or width actually changed.
				let contentMemoKey = "";
				let contentMemo: string[] = [];
				const contentFor = (w: number): string[] => {
					const sig =
						w +
						"|" +
						mem.history.map((l) => l.kind + l.text.length).join(",") +
						"|" +
						mem.ground.length +
						"|" +
						mem.tailTokens;
					if (sig === contentMemoKey) return contentMemo;
					contentMemoKey = sig;
					contentMemo = buildContent(w);
					return contentMemo;
				};

				function handleInput(data: string): void {
					// Transcript viewport controls (PageUp/PageDown/Home/End) detach from the
					// newest message so you can read older output and long answers.
					if (matchesKey(data, Key.pageUp) || matchesKey(data, Key.ctrl("y"))) {
						anchored = false;
						prevTop -= Math.max(1, Math.floor(prevPage));
						tui.requestRender();
						return;
					}
					if (matchesKey(data, Key.pageDown) || matchesKey(data, Key.ctrl("e"))) {
						prevTop += Math.max(1, Math.floor(prevPage));
						// If we reach the bottom, follow again.
						if (prevTop >= lastMaxTop) anchored = true;
						tui.requestRender();
						return;
					}
					if (matchesKey(data, Key.home)) {
						anchored = false;
						prevTop = 0;
						tui.requestRender();
						return;
					}
					if (matchesKey(data, Key.end)) {
						anchored = true;
						tui.requestRender();
						return;
					}

					// Esc at the prompt always exits; during a generation it also cancels.
					if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("d"))) {
						input.onEscape?.();
						return;
					}

					// ↑/↓ walk the sent-message history inside the compose field.
					if (matchesKey(data, Key.up)) {
						if (sentHistory.length === 0) return;
						if (histCursor === sentHistory.length) savedDraft = input.getValue();
						if (histCursor > 0) {
							histCursor--;
							input.setValue(sentHistory[histCursor]);
						}
						refresh();
						return;
					}
					if (matchesKey(data, Key.down)) {
						if (sentHistory.length === 0 || histCursor >= sentHistory.length) return;
						histCursor++;
						input.setValue(histCursor === sentHistory.length ? savedDraft : sentHistory[histCursor]);
						refresh();
						return;
					}

					// Forward normal typing/editing/Enter to the compose input.
					input.handleInput(data);
					refresh();
				}

				let lastMaxTop = 0;
				let prevPage = 10;

				function render(width: number): string[] {
					const w = Math.max(2, width);
					const rows: string[] = [];

					// Vertical budget: recomputed from the live terminal each frame.
					const liveRows = Math.max(12, process.stdout.rows ?? 24);

					// Header is fixed above the scrolling transcript.
					const ctxTag = mem.tailTokens > 0 ? `${Math.round(mem.tailTokens / 1000)}k` : "off";
					rows.push(
						theme.fg("accent", `─ ${theme.bold(`${TITLE} · context:${ctxTag} · files:${mem.ground.length}`)} ─`.padEnd(w, "─")),
					);
					rows.push("");

					// Reserve lines BELOW the transcript for: status(0-1) + blank + compose + hint.
					const footerReserve = statusLine ? 5 : 4; // status+blank+input+hint  OR  blank+input+hint
					const regionH = Math.max(4, liveRows - 2 - footerReserve); // minus header(1)+blank(1)

					// Full transcript content (nothing is dropped; older lines are reachable
					// by scrolling up the in-panel window).
					const content = contentFor(w);
					const contentLen = content.length;
					const maxTop = Math.max(0, contentLen - regionH);

					lastMaxTop = maxTop;
					prevPage = Math.max(1, Math.ceil(regionH / 20)); // ~20 PgUp/PgDn presses per viewport

					// Determine the top of the visible slice.
					let top = anchored ? maxTop : prevTop;
					top = Math.max(0, Math.min(maxTop, top));
					prevTop = top; // remember where we are now for the next scroll step

					// A one-line marker when older content sits above the window.
					if (top > 0) {
						rows.push(theme.fg("muted", "↑ older (PgUp/Home to read it)"));
					}

					// The actual visible slice.
					const visible = contentLen > regionH ? content.slice(top, top + regionH) : content;
					for (const line of visible) rows.push(line ?? "");

					if (statusLine) {
						rows.push(theme.fg("muted", statusLine));
					}
					rows.push("");
					rows.push(theme.fg("dim", "─".repeat(w)));

					// Compose line + hint.
					const [promptLine] = input.render(Math.max(1, w - 2));
					rows.push(theme.fg("dim", promptLine));
					rows.push(
							theme.fg("dim",
								"PgUp/PgDn or Home/End scroll · ↑/↓ past messages · Enter send · Esc or /quit leaves · /help",
							)
							.trimEnd(),
					);

					// Width safety net.
					for (let i = 0; i < rows.length; i++) if (rows[i]) rows[i] = truncateToWidth(rows[i], w, "");
					return rows;
				}

				return {
					render,
					invalidate: () => {},
					handleInput,
				};
			});

			if (ctx.hasUI) {
				ctx.ui.notify("Left btw — back to DeepSeek. Nothing was written to its context.", "info");
			}
		},
	});
}
