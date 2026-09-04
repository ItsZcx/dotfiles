# dotfiles

Personal dotfiles managed with [chezmoi](https://www.chezmoi.io/).

## What's included

| File | Purpose |
|------|---------|
| `dot_zshrc` | Zsh config (Oh My Zsh, aliases, PATH, plugins) |
| `dot_gitconfig` | Git identity and defaults |
| `run_once_before_setup-zsh-10.sh` | Install Oh My Zsh + plugins (autosuggestions, syntax-highlighting) |
| `run_once_before_packages-10.sh` | APT core packages (curl, git, zsh, build-essential, neofetch) |
| `run_once_before_setup-zoxide-20.sh` | Zoxide installer (curl, since APT version is slow/outdated on Ubuntu) |

## Requirements

- A Linux machine (APT-based distro assumed for the `packages` script)
- `sudo` access to install packages

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

```bash
chezmoi init --apply ItsZcx/dotfiles
```

> Your public repo is `github.com/ItsZcx/dotfiles`. The shortcut above uses
> chezmoi's built-in GitHub support. If you use SSH, run this instead:
>
> ```bash
> chezmoi init --apply git@github.com:ItsZcx/dotfiles.git
> ```

This clones the repo, installs Oh My Zsh + plugins, APT packages, Zoxide, and
writes `~/.zshrc` and `~/.gitconfig`.

### 3. Make zsh your default shell (optional)

After the first apply, switch to zsh:

```bash
chsh -s "$(which zsh)"
```

Log out and back in, or just start zsh:

```bash
zsh
```

---

## Day-to-day commands

```bash
# Pull any remote changes and apply them
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

- `run_once_before_setup-zsh-10.sh` — installs Oh My Zsh and its plugins once.
- `run_once_before_packages-10.sh` — refreshes APT and installs core packages once.
- `run_once_before_setup-zoxide-20.sh` — installs Zoxide once (via curl, see below).

> **Why curl for Zoxide?** The Ubuntu APT repo ships a very outdated Zoxide.
> The maintainers recommend installing via the official curl script, so it lives in
> its own `run_once_before` script separate from the APT packages.

The numeric suffix (e.g. `-10`, `-20`) controls ordering.

---

## Customizing the package list

The `run_once_before_packages-10.sh` script contains a `PACKAGES` array:

```bash
PACKAGES=(
    curl
    git
    zsh
    build-essential
    neofetch
    # docker
    # nvim
)
```

Uncomment or add entries, then commit and push:

```bash
chezmoi cd    # jump into the source repo
vim run_once_before_packages-10.sh
git add -A && git commit -m "Add packages"
git push
```

---

## Notes

- **Git identity** lives in `dot_gitconfig`. Change it in the source repo and push if you want a different name/email.
- **Private files** can be stored with `.chezmoiignore` / `chezmoi add --encrypt` if you ever need secrets.
- Verify what would change before applying with `chezmoi diff` and `chezmoi apply --dry-run`.
