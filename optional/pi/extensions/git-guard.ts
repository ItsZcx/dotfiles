import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Git push guardrail — Pi may commit, but must NEVER push.
 *
 * Intercepts every `bash` tool call and hard-blocks any real `git push`
 * invocation with no approval path: pushing is always done by the user, from
 * their own terminal. Non-push git commands (e.g. `git commit`) are allowed
 * silently and are not intercepted.
 *
 * Detection: split the command into shell statements (on `&&`, `||`, `;`, `|`,
 * `(`, newline). For each statement, drop leading env assignments and a leading
 * `sudo`, locate `git`, skip any `-<flag> <value>` option pairs that precede the
 * subcommand, and treat the first remaining bare token as the subcommand. If it
 * is `push` in any statement, the whole command is blocked — so compound lines
 * like `git commit && git push origin main` are caught. Commands that merely
 * echo the words, or are `#`-comments, are not treated as git runs.
 *
 * Global: lives in ~/.pi/agent/extensions/, applies to every project/session.
 * Fail-closed for push; there is deliberately no confirm escape hatch.
 */
export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event) => {
    if (event.toolName !== "bash") return;

    const raw: string = (event.input?.command ?? "") as string;
    if (!raw.trim()) return;

    if (containsRealPush(raw)) {
      return {
        block: true,
        reason:
          "Blocked by git guardrail: Pi is allowed to commit but may NEVER push. Push manually from your own terminal.",
      };
    }
  });
}

/** True if any shell statement in `cmd` runs `git ... push`. */
function containsRealPush(cmd: string): boolean {
  // Split into statement starts on the usual bash command separators.
  // This also naturally drops `#`-comments after a separator (a pure comment
  // line yields an empty/comment-only statement that won't parse as a push).
  const statements = cmd.split(/\s*(?:&&|\|\||;|\||\(|\n)\s*/);
  return statements.some((stmt) => {
    const trimmed = stmt.replace(/#.*$/, "").trim();
    if (!trimmed) return false;
    return getGitSubcommand(trimmed) === "push";
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
