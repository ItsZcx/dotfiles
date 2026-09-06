# dotfiles

Personal dotfiles managed with [chezmoi](https://www.chezmoi.io/).

## What's included

| File | Purpose |
|------|---------|
| `dot_zshrc` | Zsh config (Oh My Zsh, aliases, PATH, plugins) |
| `dot_gitconfig` | Git session defaults (no personal identity — set per machine) |
| `run_once_before_setup-zsh-10.sh` | Install Oh My Zsh + plugins (autosuggestions, syntax-highlighting) |
| `run_once_before_packages-10.sh` | Core CLI packages via the right package manager (apt on Linux, Homebrew on macOS) |
| `run_once_before_setup-zoxide-20.sh` | Zoxide installer (curl; APT's version is stale on Ubuntu, brew has it too) |

## Supported platforms

- **Linux** (APT-based) — `apt-get` for packages, plus XDG utils
- **macOS** — **Homebrew** for packages (installed automatically if missing) + Apple's **Xcode Command Line Tools**

The setup scripts detect the running platform at runtime — **no hardcoded OS/version strings** — and pick the package manager accordingly.

## Requirements

- `curl` and `git` available to bootstrap
- The repo is **public**, so no GitHub account/auth is needed just to clone
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

Because the repo is **public**, cloning needs no credentials:

```bash
chezmoi init --apply ItsZcx/dotfiles
```

> Using the HTTPS shorthand (`ItsZcx/dotfiles`) means anyone can clone without
> auth. If you'd rather clone over SSH instead, run:
>
> ```bash
> chezmoi init --apply git@github.com:ItsZcx/dotfiles.git
> ```

This applies the dotfiles and runs the install scripts: Oh My Zsh + plugins,
core packages (via Homebrew/Xcode CLT on macOS, apt on Linux), Zoxide, and
writes `~/.zshrc` and `~/.gitconfig`.

### 3. Set your Git identity once (required for your first commit)

Git identity is **not** stored in this repo (so it's safe to make public and
so you can use the right identity per machine, e.g. work vs personal). Set it
once — it persists in `~/.gitconfig` on that machine:

```bash
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

> You only need this the first time you commit anywhere on a new machine. Clone,
> pull and apply all work without it. For a job workstation, use the job
> identity here instead of a personal one.

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

- `run_once_before_setup-zsh-10.sh` — installs Oh My Zsh and its plugins once.
- `run_once_before_packages-10.sh` — installs core CLI packages once, using the platform's package manager.
- `run_once_before_setup-zoxide-20.sh` — installs Zoxide once (via curl at `setup-zoxide-20`, as its `.sh` suffix + curl approach keeps it portable).

> **Why curl for Zoxide?** The Ubuntu APT repo ships a very outdated Zoxide.
> The maintainers recommend installing via the official curl script, so Zoxide
> lives in its own portable `run_once_before` script that works on both Linux
> and macOS (it also picks up `brew` where present).

The numeric suffix (e.g. `-10`, `-20`) controls ordering.

---

## How the packages script picks a package manager

At runtime the script maps the current kernel into a coarse family
(`linux`, `macos`, else errors out) and runs the matching installer:

- **Linux:** `sudo apt-get update && sudo apt-get install ...`
- **macOS:** ensures Xcode Command Line Tools (triggers a GUI dialog if
  missing), installs Homebrew if absent, then `brew install ...`

It **never hardcodes a specific OS or version string**, so it keeps working as
then kernel naming/versions evolve.

## The macOS compiler note (`build-essential` vs Xcode CLT)

Your Linux list includes `build-essential` (a GCC toolchain). macOS has no such
APT package — Apple instead provides the **Xcode Command Line Tools**, which
yield the `clang` compiler via a one-time GUI install (also required by
Homebrew). We deliberately do **not** `brew install gcc` on macOS; the default
`clang` from Xcode CLT is the system compiler. If you later want real GNU gcc
on the Mac, uncomment `gcc` in the tool list for that machine.

---

## Customizing the packages

The `run_once_before_packages-10.sh` script installs a common `TOOLS` list of
CLI names on every platform (each is skipped if `command -v` already finds it):

```bash
TOOLS=(curl git zsh neofetch)
```

Linux additionally installs `build-essential` (see above). The commented
`docker` / `nvim` entries show where to add platform- or app-specific packages.

---

## Notes

- **Git identity is intentionally not committed** (kept out of `dot_gitconfig` so
the repo is safe to make public and so each machine picks the right name/email).
Set it once per machine — see step 3 of the setup.
- **Pushing changes** requires write access to the (public → read-only for
strangers) repo. Set up an SSH key on GitHub once if you want to commit/push
from that machine:
  `ssh-keygen -t ed25519` then add `~/.ssh/id_ed25519.pub` at
  https://github.com/settings/ssh/new, then `ssh -T git@github.com` to verify.
  (Cloning needs none of this since the repo is public.)
- **Sensitive values** must never be committed in this now-public repo — use
`.chezmoignore` / `chezmoi add --encrypt` for anything secret.
- Verify what would change before applying with `chezmoi diff` and
`chezmoi apply --dry-run`.
