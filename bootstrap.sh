#!/usr/bin/env bash
#
# bootstrap.sh — one-shot setup for a fresh Linux/macOS machine running the
# ItsZcx/dotfiles chezmoi setup.
#
#   Linux / macOS (zsh or bash):
#     sh -c "$(curl -fsSL https://raw.githubusercontent.com/ItsZcx/dotfiles/main/bootstrap.sh)"
#
# That is deliberately pattern-matched to the official installers (chezmoi,
# Homebrew, Oh My Zsh). It is safe to re-run: every step is idempotent. Run it
# again after macOS asks you to finish the Xcode CLT install.
#
# What it does (in order):
#   1. Detects the platform.
#   2. Installs chezmoi if it is not already on PATH (get.chezmoi.io).
#   3. Clones & applies the dotfiles (chezmoi init --apply).
#      - On Linux: this triggers the apt + Oh My Zsh + Zoxide installers.
#      - On macOS: triggers the Xcode CLT dialog (you must click Install) and
#        then Homebrew + Oh My Zsh + Zoxide.
#   4. Offers to make zsh your login shell (Linux only).
#
# NOTE: per-machine git identity is intentionally NOT configured here. Set it
# manually once after a successful setup:
#   git config --global user.name  "Your Name"
#   git config --global user.email "you@example.com"
#
# NOTE: running remote code from the network. Review this file in the repo
# before trusting it on a machine.
set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
GITHUB_USER="ItsZcx"
REPO_NAME="dotfiles"
# Public repo, cloneable without credentials.
CLONE_TARGET="${GITHUB_USER}/${REPO_NAME}"

say()  { printf '\n==> %s\n' "$*"; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Platform detection (coarse; no brittle version strings).
# ---------------------------------------------------------------------------
case "$(uname -s)" in
  Darwin)  PLATFORM="macos" ;;
  Linux)   PLATFORM="linux" ;;
  *) die "unsupported platform: $(uname -s)" ;;
esac
say "Platform detected: ${PLATFORM}"

# ---------------------------------------------------------------------------
# 2. Install chezmoi if missing.
# ---------------------------------------------------------------------------
if ! command -v chezmoi >/dev/null 2>&1; then
  say "chezmoi not found — installing to ~/.local/bin"
  sh -c "$(curl -fsLS get.chezmoi.io)"
else
  say "chezmoi already installed: $(chezmoi --version)"
fi

# chezmoi installs to ~/.local/bin; make sure it's reachable for this run.
if ! command -v chezmoi >/dev/null 2>&1 && [ -x "$HOME/.local/bin/chezmoi" ]; then
  export PATH="$HOME/.local/bin:$PATH"
fi
command -v chezmoi >/dev/null 2>&1 || die "chezmoi still not on PATH"

# ---------------------------------------------------------------------------
# 3. Clone & apply the dotfiles. This is what runs the run_once_before_* and
#    run_once_after_* installers in the repo.
# ---------------------------------------------------------------------------
say "Initializing dotfiles from ${CLONE_TARGET}"
chezmoi init --apply "${CLONE_TARGET}"

# macOS finishing note for Xcode CLT if it wasn't ready (the apply above may
# have only reached a partially done state if the CLT dialog was declined).
if [ "${PLATFORM}" = "macos" ]; then
  say "If Apple prompted you for Xcode Command Line Tools during apply, click"
  say "Install, then re-run this script once it has finished."
fi

# ---------------------------------------------------------------------------
# 4. Closing notes.
# ---------------------------------------------------------------------------
say "Done. Open a new shell (or run 'zsh') to load the new config."

# Make zsh the login shell if it's installed and not already the default, but
# only ask on Linux (macOS already defaults to zsh). $SHELL is not always the
# login shell, so don't trust it blindly — but it's a good enough gate for the
# interactive prompt here.
CUR_SHELL="$(basename "${SHELL:-}" 2>/dev/null || true)"
if [ "${PLATFORM}" = "linux" ] && [ "${CUR_SHELL}" != "zsh" ] && command -v zsh >/dev/null 2>&1; then
  printf 'Make zsh your login shell now? [y/N] '
  read -r SWITCH_SHELL
  if [ "${SWITCH_SHELL:-n}" = "y" ] || [ "${SWITCH_SHELL:-n}" = "Y" ]; then
    chsh -s "$(command -v zsh)"
    say "Login shell set to zsh. Log out and back in for it to fully apply."
  fi
fi

echo
exit 0
