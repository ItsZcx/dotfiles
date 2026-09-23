# dotfiles

Personal dotfiles managed with [chezmoi](https://www.chezmoi.io/).

## What's included

| File                                 | Purpose                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `dot_zshrc`                          | Zsh config (Oh My Zsh, `git` plugin, aliases, PATH, zoxide, NVM)                  |
| `dot_gitconfig`                      | Git session defaults (no personal identity, set per machine)                      |
| `run_once_before_setup-zsh-10.sh`    | Install Oh My Zsh (unattended)                                                    |
| `run_once_before_packages-10.sh`     | Core CLI packages via the right package manager (apt on Linux, Homebrew on macOS) |
| `run_once_before_setup-zoxide-20.sh` | Zoxide installer (curl; APT's version is stale on Ubuntu, brew has it too)        |
| `bootstrap.sh`                       | Hosted one-line installer (see Setup)                                             |
| `install.sh`                         | **Optional** checkbox menu (see below)                                            |
| `optional/pi/`                       | Optional `pi` config, skills, extensions, agents, guardrail, templates            |

## Supported platforms

- **Linux** (APT-based), `apt-get` for packages, plus XDG utils
- **macOS**, **Homebrew** for packages (installed automatically if missing) + Apple's **Xcode Command Line Tools**

The setup scripts detect the running platform at runtime, and pick the package manager accordingly.

## Requirements

- `curl` and `git` available to bootstrap
- On Linux: `sudo` access to install packages
- On macOS: you'll be prompted to accept Apple's **Xcode Command Line Tools** installer dialog (Homebrew needs it)

---

## Setup on a new machine

### Quickstart (one line)

Run this — it installs chezmoi, clones + applies the dotfiles, and offers to
switch your login shell to zsh. Everything is idempotent, so re-running is safe
(needed after macOS finishes the Xcode CLT install):

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ItsZcx/dotfiles/main/bootstrap.sh)"
```

On macOS, if prompted, accept the **Xcode Command Line Tools** installer, wait
for it to finish, then run the command again.


### Manual / step-by-step (optional)

The equivalent steps, if you prefer to do it yourself:

**1. Install chezmoi** (installs to `~/.local/bin`):

```bash
sh -c "$(curl -fsLS get.chezmoi.io)"
export PATH="$HOME/.local/bin:$PATH"
```

**2. Initialize the dotfiles** (no credentials needed — public repo):

```bash
chezmoi init --apply ItsZcx/dotfiles
```

This applies the dotfiles and runs the install scripts: Oh My Zsh,
core packages (via Homebrew/Xcode CLT on macOS, apt on Linux), Zoxide, and
writes `~/.zshrc` and `~/.gitconfig`.

**3. Make zsh your default shell (optional)** — macOS already defaults to zsh:

```bash
chsh -s "$(which zsh)"   # then log out and back in
```

### Set Git identity (manual, once per machine)

The default shell commands do **not** set your git identity. Do this yourself
after setup, so you can use the right name/email for each machine (e.g. work vs
personal). It is required before your first `git commit`:

```bash
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

### Optional features (per-machine selection)

`bootstrap.sh` finishes by asking which *optional* extras to configure. Core
items (`.zshrc`, `.gitconfig`, and the three unconditional installers) are
always applied; optional items are opt-in so a work machine can stay clean.

To run the selection menu yourself (from the source checkout):

```bash
bash ~/.local/share/chezmoi/install.sh
```

A checkbox list appears — move with **Up/Down**, toggle with **Space**, run
checked items with **Enter**, quit with **q**.

**Available optional features:**

- **`pi`** — deploys `optional/pi/agent-settings.json` and
  `optional/pi/keybindings.json` to `~/.pi/agent/`.

  `settings.json` sets the theme (`dark`), default provider/model
  (`deepseek` / `deepseek-flash`), thinking level (`off`), TUI mode, the
  enabled-model list, and the `npm:pi-web-access` package.
  `keybindings.json` adds word-wise delete bindings (Ctrl/Alt+Backspace, Ctrl+W,
  Alt+D).

  > API keys are **never** stored here. Authenticate once per machine inside a
  > pi session with `/login` (or export the provider key), then your config
  > file is ready. Existing files are backed up before overwriting.

- **`pi-skills`** — installs the curated skills in `optional/pi/skills/` to
  `~/.pi/agent/skills/` so they are available as `/skill` commands on every
  pi session.

  **Installed skills** (adapted from [mattpocock/skills](https://github.com/mattpocock/skills)
  and [cursor/plugins pstack](https://github.com/cursor/plugins); Codex `agents/`
  scaffolding and Cursor-specific coupling removed; each is pi-compatible):

  | Skill | Purpose |
  |---|---|
  | `ask-matt` | Router: asks which skill/flow fits your situation (manual only) |
  | `codebase-design` | Deep-module architecture vocabulary |
  | `code-review` | Review changes since a fixed point against standards + spec |
  | `diagnosing-bugs` | 4-step reproduce→isolate→trace→fix loop for hard bugs |
  | `domain-modeling` | Sharpen project domain model, CONTEXT.md, ADRs |
  | `grilling` | Relentless design/plan interview |
  | `grill-with-docs` | Grilling that also writes ADRs and a glossary (manual only) |
  | `implement` | Build a spec/ticket set test-first, then review the diff (manual only) |
  | `improve-codebase-architecture` | Scan for deepening opportunities, report, then grill (manual only) |
  | `prototype` | Throwaway spikes to answer design questions |
  | `research` | Structured research against high-trust primary sources |
  | `resolving-merge-conflicts` | Methodical git conflict resolution |
  | `tdd` | Test-driven development (red-green-refactor) |
  | `technical-writing` | Layered doc standard (Diátaxis/Google/STE/Global English; manual only) |
  | `to-spec` | Turn the conversation into a written spec (manual only) |
  | `to-tickets` | Break a plan into tracer-bullet tickets (manual only) |
  | `unslop` | Strip AI tells / add human voice (**auto-applies to all prose**) |
  | `wizard` | Generate an interactive bash wizard for human-only steps |

  > `unslop` is **model-invocable** (auto-applies when pi writes any prose).
  > Skills marked *manual only* carry `disable-model-invocation: true`: they
  > stay out of automatic context and are fired deliberately via `/skill:<name>`.

  Skills are idempotent to deploy and never overwrite an existing local skill
  of the same name. Some carry supporting files (e.g. `DEEPENING.md`,
  `tests.md`, `template.sh`) that are copied along with them.

- **`pi-extensions`** — installs the worker extensions in
  `optional/pi/extensions/` to `~/.pi/agent/extensions/`:

  - **`btw.ts`** — a `/btw` side-chat screen pinned to
    `google/gemini-3.5-flash-lite`. It is fully isolated from your main
    session: it never routes through the agent loop, never grows the main
    model's context, and is discarded when you leave. Slash commands inside it:
    `/context`, `/read <path>`, `/ls`/`/tree`, `/clear`, `/quit`.
  - **`subagent/`** — delegate tasks to subagents in isolated context windows,
    with streaming output, parallel execution, and per-agent usage tracking.

  > `git-guard.ts` is deliberately **not** installed by this feature — it
  > belongs to `pi-guard`, which force-copies it so guardrail updates land.

  Deployment never overwrites an existing extension of the same name, so a
  locally-tweaked `btw.ts` is safe.

- **`pi-agents`** — installs the subagent definitions in `optional/pi/agents/`
  to `~/.pi/agent/agents/`: `scout` (fast recon returning compressed context),
  `planner` (implementation plans), `reviewer` (quality/security review), and
  `worker` (general-purpose, full capabilities, isolated context).

  > Needed by the `/implement`, `/scout-and-plan` and `/implement-and-review`
  > prompts, which drive the `subagent` extension. Install this alongside
  > `pi-extensions` and `pi-prompts`.

- **`pi-guard`** — installs `optional/pi/extensions/git-guard.ts` and
  `optional/pi/APPEND_SYSTEM.md` to `~/.pi/agent/`.

  This is a **global guardrail**: pi can **never** run `git push`, and it must
  **not commit unless you tell it to**. Pushing is always done by you manually,
  and push is hard-blocked with no approval escape hatch (fail-closed) — the
  extension intercepts every `bash` call, splits compound commands, and blocks
  any statement whose git subcommand is `push`. Commits are governed by a
  standing instruction (`APPEND_SYSTEM.md`): pi leaves finished work
  uncommitted and waits for you to ask, so it never commits on its own after
  making changes. Any clear instruction works — `/commit` is the canonical form,
  but "commit this" counts too. Restart pi or run `/reload` after installing.

  Unlike the other pi features, these two files are **overwritten** (with a
  timestamped `.orig.<timestamp>` backup) so that guardrail fixes actually
  reach a machine that already has an older copy.

- **`pi-prompts`** — installs `optional/pi/prompts/*.md` to
  `~/.pi/agent/prompts/`, giving you reusable `/commands`.

  - **`/commit`** — commits uncommitted work in separate logical commits
    following the Conventional Commits spec (type/scope/subject/body rules),
    shows you the plan and exact commands first, waits for your confirmation,
    and never pushes (push stays manual). This is the canonical way to ask pi
    to commit (see `pi-guard` above).
  - **`/bro`** — restates pi's last message in plain human language, no jargon.
  - **`/implement`** — scout → planner → worker chain over `$@`.
  - **`/scout-and-plan`** — scout → planner, no implementation.
  - **`/implement-and-review`** — worker → reviewer → worker chain.

  The three workflow prompts require the `subagent` extension
  (`pi-extensions`) and the agent definitions (`pi-agents`).

- **`pi-web-access`** — installs the `pi-web-access` package via
  `pi install npm:pi-web-access` (skipped if already present) and seeds
  `~/.pi/agent/web-search.json` from the repo template.

  This provides the `web_search`, `source_check`, `fetch_content`, and
  `get_search_content` tools plus the `/websearch`, `/curator` and `/search`
  commands.

  > The template ships an empty/placeholder `tinyfishApiKey`, so searches fall
  > back to zero-config Exa until you paste a real key. The installer **never**
  > overwrites an existing `web-search.json`, so a pasted key is safe. Keep the
  > repo copy empty — never commit your real key.

Adding future optional things (skills, editors, tools) = one entry in
`install.sh`'s feature manifest plus an `optional/<name>/` folder.

---

## Day-to-day commands

```bash
# Pull any remote changes and apply them (works via HTTPS on a public repo;
# if you cloned over SSH this uses your key)
chezmoi update

# Re-apply the dotfiles after editing (also triggers the "before" scripts)
chezmoi apply

# Edit the zshrc (opens $EDITOR on the source file, then offers to apply)
chezmoi edit ~/.zshrc

# Add an existing file into the dotfiles repo
chezmoi add ~/.somefile

# See the diff between your local file and the repo
chezmoi diff
```

---

## How the scripts work

chezmoi runs scripts automatically based on their filename prefix:

| Prefix       | When it runs                               |
| ------------ | ------------------------------------------ |
| `run_once_*` | Only once, ever (until the script changes) |

- `run_once_before_setup-zsh-10.sh`, installs Oh My Zsh once (unattended).
- `run_once_before_packages-10.sh`, installs core CLI packages once, using the platform's package manager.
- `run_once_before_setup-zoxide-20.sh`, installs Zoxide once (via curl at `setup-zoxide-20`, as its `.sh` suffix + curl approach keeps it portable).

> **Why curl for Zoxide?** The Ubuntu APT repo ships a very outdated Zoxide.
> The maintainers recommend installing via the official curl script, so Zoxide
> lives in its own portable `run_once_before` script that works on both Linux
> and macOS (it also picks up `brew` where present).

The numeric suffix (e.g. `-10`, `-20`) controls ordering.

## Notes

### Set up an SSH key for GitHub

1. Generate an Ed25519 SSH key:

	```bash
	ssh-keygen -t ed25519
	```

2. Add the public key from `~/.ssh/id_ed25519.pub` to [GitHub's SSH key settings](https://github.com/settings/ssh/new).

3. Verify the connection:

	```bash
	ssh -T git@github.com
	```
