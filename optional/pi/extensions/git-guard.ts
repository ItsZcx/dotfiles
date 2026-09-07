import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Git guardrail — never commit or push without explicit user approval.
 *
 * Intercepts every `bash` tool call and blocks `git commit` / `git push`
 * (and common variants) unless the user confirms in the terminal.
 *
 * Global: lives in ~/.pi/agent/extensions/, applies to every project/session.
 * Fail-closed: if confirmation cannot be obtained (e.g. non-interactive run)
 * the command is blocked rather than allowed.
 */
export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return;

    const command: string = (event.input?.command ?? "") as string;
    if (!command.trim()) return;

    // Match git commit/push invocations, tolerating common shapes:
    //   git commit -m ...
    //   git -C /some/dir commit ...
    //   sudo git push origin main
    //   git push --force-with-lease
    const dangerous =
      /\bgit(\s+-C\s+\S+)?\s+(commit|push)(\s|$)/.test(command.trim()) &&
      // Ignore benign mentions that are not actual invocations.
      !/^(#|\/\/).*/.test(command.trim());

    if (!dangerous) return;

    const allowed = await ctx.ui.confirm(
      "Git guardrail",
      `Pi wants to run a git write command:\n\n  ${command.trim()}\n\nAllow it? (Push is usually done manually.)`,
    );

    if (!allowed) {
      return {
        block: true,
        reason:
          "Blocked by git guardrail: user did not approve this git commit/push.",
      };
    }
  });
}
