---
name: wizard
description: >-
  Generate an interactive bash wizard that walks a human through steps only
  they can perform. Use when provisioning infrastructure, setting up
  credentials or local env secrets, walking an unfamiliar third-party
  dashboard, or running a one-off migration or cutover. Don't invoke this for
  steps the agent can perform itself.
---

<!--
Pi port notes (mattpocock/skills -> pi):
- Invocation: model-invoked (no disable-model-invocation) so the agent reaches
  for it when a human-only procedure appears. Force-run anytime with /skill:wizard.
- GitHub: fully optional. The gh-backed helpers (set_secret/set_var) degrade to
  "record + remind a human to do it later" when gh is absent, so a wizard works
  fine with no CI secrets at all; they light up automatically if gh is ever added.
-->

# Wizard

A **wizard** is a bash script that walks a human, step by step, through a manual procedure that's tedious to do by hand and tedious to re-explain to an AI every time. It opens each URL, says exactly what to click and copy, captures the values, writes them where they belong (`.env`, or CI secrets when a remote is configured), confirms at every stage, and shows how many stages are left. It might configure third-party services, run a one-off migration, or move the project from one state to another.

The readable UX is already solved by [template.sh](template.sh): stage-by-stage progress, confirmation gates, cross-platform URL opening (including WSL), hidden secret entry, idempotent `.env` upserts, optional `gh secret`/`gh variable` writes, and a closing summary. **Your job is only to scope the procedure and author its stages.** The library above the `STAGES` marker is identical in every wizard; that consistency is the point: never hand-edit it.

A wizard is ephemeral by default: built for one run, saved to a scratch or `scripts/` path, deleted when the job's done. Commit it only when the user wants a repeatable setup path that should live in the repo.

## Process

### 1. Scope the procedure

Work out every manual step the human must take and every value that gets captured along the way. Read the repo first, don't ask cold:

- For setup: `.env`, `.env.example`, `.env.*`, `README`, `docker-compose*`, framework config, and any CI workflow files (`.github/workflows/*`, etc.). Every `secrets.something` / `vars.something` reference in CI is a value the wizard must produce — but only produce it if that remote/CI actually exists. If there is no CI, skip the remote legs entirely and capture to `.env` only.
- For a migration or transition: the current state, the target state, and the irreversible actions between them.

Then show the user the ordered list of stages and the values each produces, and confirm: they may add, drop, or reorder.

**Done when:** every stage is named in order, and for each captured value you know (a) where the human gets it, (b) where it's written (`.env`, a remote secret, both, or nowhere; some stages are pure actions), and (c) whether it's secret (hidden entry) or public.

### 2. Map each stage's journey

For each stage, write the precise path a human follows: which URL to open, what to do there, where a value is shown, which variable it fills: e.g. "Dashboard → Developers → API keys → Reveal test key → copy". Where you don't actually know the current UI or the exact command, say so and ask the user or check the docs: never invent steps that may not exist.

**Done when:** every stage traces to concrete instructions a stranger could follow.

### 3. Author the wizard

Copy `template.sh` to the target path. Replace the example stage with one `stage` per step, in dependency order. Use the library helpers: `stage`, `say`/`step`, `open_url`, `ask`/`ask_secret`, `write_env`, `set_secret`/`set_var`, `pause`/`confirm`. Set `TOTAL_STAGES` to the number of stages you wrote.

Hold the bar the template sets: open the URL before asking for its value, use `ask_secret` for anything secret, `write_env` every persisted value, `set_secret` only the values a real CI actually needs (omit it when there's no such remote), and `confirm` before any irreversible action. Each `stage` clears the screen so only the current step is visible: keep a stage to one focused task so nothing the human needs scrolls away. Don't touch the library above the marker.

The example stage under the marker calls `set_secret` for CI. If this wizard's repo has no CI secrets to set, drop that line — it is not mandatory; `set_secret`/`set_var` are only needed where a remote pipeline consumes the value.

### 4. Verify and hand off

- `bash -n <script>`; run `shellcheck` if available.
- `chmod +x <script>`.
- Don't run it end-to-end yourself: it opens browsers and blocks on human input. Trace it statically instead: every value from step 1 is captured and lands where step 1 said, and every `set_secret` name exactly matches a `secrets.*` reference in any CI that exists.
- Tell the user how to run it. If it's a repeatable setup path, commit it and link it from the README so the next person runs the script instead of asking an AI.
