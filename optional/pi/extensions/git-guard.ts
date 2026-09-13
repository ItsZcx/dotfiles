import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Git guardrail — Pi may NEVER push, and may only commit when explicitly told.
 *
 * Two rules, both hard-blocked at the `tool_call` layer:
 *
 *  1. `git push` is always blocked. Pushing is done by the user, from their own
 *     terminal. Fail-closed; no approval path.
 *
 *  2. `git commit` is blocked unless the current turn was started by an explicit
 *     `/commit` (see COMMIT_TRIGGER_RE below). This makes the user the only one
 *     who decides when commits happen, instead of the model committing on its
 *     own after making changes.
 *
 * The commit allowance is armed by the `input` hook when the user submits the
 * `/commit` prompt template, and consumed by the next `git commit` tool call.
 * It is deliberately one-shot per user message: the model cannot keep committing
 * across turns. `/commit` commits several logical commits in a row, so the flag
 * grants the whole turn and clears when the next user message arrives.
 *
 * Detection: split the command into shell statements (on `&&`, `||`, `;`, `|`,
 * `(`, newline). For each statement, drop leading env assignments and a leading
 * `sudo`, locate `git`, skip any `-<flag> <value>` option pairs that precede the
 * subcommand, and treat the first remaining bare token as the subcommand. If any
 * statement is `push`, the whole command is blocked; `commit` is blocked unless
 * armed. Commands that merely echo the words, or are `#`-comments, are not
 * treated as git runs.
 *
 * Global: lives in ~/.pi/agent/extensions/, applies to every project/session.
 */

/**
 * Raw user input that arms a one-shot commit allowance for the turn.
 * Matches `/commit`, `/commit <args>`, and the prompt-template form
 * `/prompt commit` / `/prompt commit <args>`.
 */
const COMMIT_TRIGGER_RE = /^\/(?:prompt\s+)?commit(?:\s|$)/;

export default function (pi: ExtensionAPI) {
  // Armed when the user explicitly asks for a commit; cleared on the next
  // non-commit user message so the model can't smuggle commits into later turns.
  let commitArmed = false;

  pi.on("input", async (event) => {
    const text = (event.text ?? "").trim();
    if (COMMIT_TRIGGER_RE.test(text)) {
      commitArmed = true;
      return;
    }

    // Any other user message disarms: a commit from here on is model-initiated.
    // Note this includes assistant/extension-injected text, which is fine — the
    // only way to (re)arm is a literal /commit input.
    commitArmed = false;
  });

  pi.on("tool_call", async (event) => {
    if (event.toolName !== "bash") return;

    const raw: string = (event.input?.command ?? "") as string;
    if (!raw.trim()) return;

    if (containsSubcommand(raw, "push")) {
      return {
        block: true,
        reason:
          "Blocked by git guardrail: Pi is allowed to commit but may NEVER push. Push manually from your own terminal.",
      };
    }

    if (!commitArmed && containsSubcommand(raw, "commit")) {
      return {
        block: true,
        reason:
          "Blocked by git guardrail: commits only happen when you run /commit. Stage, review, and run /commit yourself — do not commit on your own.",
      };
    }
  });
}

/** True if any shell statement in `cmd` runs `git ... <subcommand>`. */
function containsSubcommand(cmd: string, subcommand: string): boolean {
  // Split into statement starts on the usual bash command separators.
  // This also naturally drops `#`-comments after a separator (a pure comment
  // line yields an empty/comment-only statement that won't parse as a git run).
  const statements = cmd.split(/\s*(?:&&|\|\||;|\||\(|\n)\s*/);
  return statements.some((stmt) => {
    const trimmed = stmt.replace(/#.*$/, "").trim();
    if (!trimmed) return false;
    return getGitSubcommand(trimmed) === subcommand;
  });
}

/**
 * If `stmt` is a git-invoking statement, return its git subcommand
 * (the first non-flag token after `git` and any `-<flag> <value>` options).
 * Returns undefined when the statement does not invoke git.
 */
function getGitSubcommand(stmt: string): string | undefined {
  const tokens = tokenize(stmt);
  let i = 0;

  // Leading env assignments: NAME=VALUE ...
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i++;

  // Optional leading wrapper like `sudo`, `time`, `env`.
  while (i < tokens.length && /^(sudo|time|env)$/.test(tokens[i])) i++;

  // Look for `git` (with `git.exe` tolerated). If the next tokens are not git,
  // this isn't a git statement (e.g. `echo git push` → token after `echo` is
  // `echo`'s arg, not a git invocation we care about).
  while (i < tokens.length && tokens[i] !== "git" && tokens[i] !== "git.exe") {
    // `command`, `-C`, `--git-dir=...` etc. can precede; but genuinely git
    // statements basically start at git. If we run into an obvious non-git word
    // first (echo/cat/printf/...), abort — not a real git invocation.
    if (!/^-(?:[A-Za-z]|-[a-z])/.test(tokens[i]) && !/^command$/.test(tokens[i])) {
      return undefined;
    }
    i++;
  }
  if (i >= tokens.length || (tokens[i] !== "git" && tokens[i] !== "git.exe")) return undefined;
  i++; // consume git

  // Skip git option flags. Options with a value: -C <dir>, --git-dir <dir>,
  // --work-tree <dir>, -c <k=v>; standalone: -v, --version, --paginate etc.
  // Keep a one-token lookahead so a flag's value isn't mistaken for a subcommand.
  const flagRe = /^-(?:[A-Za-z]|-[a-z-]+)/;
  const takesValue = /^(?:-C|--git-dir|--work-tree|-c)$/;
  for (; i < tokens.length; i++) {
    const t = tokens[i];
    if (!flagRe.test(t)) break; // first non-flag token => git subcommand
    if (takesValue.test(t)) i++; // skip its value
  }

  return i < tokens.length ? tokens[i] : undefined;
}

// Minimal shlex-like tokenizer honoring single/double quotes and backslash
// escapes only loosely (commands reaching the model's bash tool are short).
const TOKEN_RE = /([^\s"'\\]+)|"([^"]*)"|'([^']*)'|\\(\S)/g;
function tokenize(s: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(s)) !== null) {
    out.push(m[1] ?? m[2] ?? m[3] ?? m[4]);
  }
  return out;
}
