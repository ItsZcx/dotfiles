# dotfiles

Personal dotfiles managed with [chezmoi](https://www.chezmoi.io/).

## What's included

| File | Purpose |
|------|---------|
| `dot_zshrc` | Zsh config (Oh My Zsh, aliases, PATH, plugins) |
| `dot_gitconfig` | Git session defaults (no personal identity, set per machine) |
| `run_once_before_setup-zsh-10.sh` | Install Oh My Zsh + plugins (autosuggestions, syntax-highlighting) |
| `run_once_before_packages-10.sh` | Core CLI packages via the right package manager (apt on Linux, Homebrew on macOS) |
| `run_once_before_setup-zoxide-20.sh` | Zoxide installer (curl; APT's version is stale on Ubuntu, brew has it too) |

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

Run these commands in order. Copy and paste each block.

### 1. Install chezmoi

```bash
sh -c "$(curl -fsLS get.chezmoi.io)"
```

This installs chezmoi to `~/.local/bin`. Make sure it's on your `PATH`:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### 2. Initialize the dotfiles

Cloning needs no credentials:

```bash
chezmoi init --apply ItsZcx/dotfiles
```

This applies the dotfiles and runs the install scripts: Oh My Zsh + plugins,
core packages (via Homebrew/Xcode CLT on macOS, apt on Linux), Zoxide, and
writes `~/.zshrc` and `~/.gitconfig`.

### 3. Set your Git identity once (required for your first commit)


```bash
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

### 4. Make zsh your default shell (optional)

After the first apply, switch to zsh:

```bash
chsh -s "$(which zsh)"
```

Log out and back in, or just start zsh:

```bash
zsh
```

> On macOS, `zsh` is normally already the default login shell, so this step
> may be unnecessary.

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

| Prefix | When it runs |
|--------|--------------|
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

**Set up an SSH key on GitHub commands**:
 - `ssh-keygen -t ed25519` 
 - `~/.ssh/id_ed25519.pub` at https://github.com/settings/ssh/new,
 - `ssh -T git@github.com` to verify.
