# dotfiles

Personal dotfiles managed with [chezmoi](https://www.chezmoi.io/).

## What's included

| File                                 | Purpose                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `dot_zshrc`                          | Zsh config (Oh My Zsh, aliases, PATH, plugins)                                    |
| `dot_gitconfig`                      | Git session defaults (no personal identity, set per machine)                      |
| `run_once_before_setup-zsh-10.sh`    | Install Oh My Zsh + plugins (autosuggestions, syntax-highlighting)                |
| `run_once_before_packages-10.sh`     | Core CLI packages via the right package manager (apt on Linux, Homebrew on macOS) |
| `run_once_before_setup-zoxide-20.sh` | Zoxide installer (curl; APT's version is stale on Ubuntu, brew has it too)        |
| `bootstrap.sh`                       | Hosted one-line installer (see Setup)                                             |
| `install.sh`                         | **Optional** B1 checkbox menu (see below)                                         |
| `optional/pi/`                       | Optional `pi` config deployed only when selected                                  |

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

This applies the dotfiles and runs the install scripts: Oh My Zsh + plugins,
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

- **`pi`** — deploys `optional/pi/agent-settings.json` to
  `~/.pi/agent/settings.json` (theme, provider, model).

  > API keys are **never** stored here. Authenticate once per machine inside a
  > pi session with `/login` (or export the provider key), then your config
  > file is ready. Existing `settings.json` is backed up before overwriting.

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

- `run_once_before_setup-zsh-10.sh`, installs Oh My Zsh and its plugins once.
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
