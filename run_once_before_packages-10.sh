#!/usr/bin/env bash
set -euo pipefail

# ----------------------------------------------------------------------
# Core package bootstrap.
#
# Runs once per machine. Detects the platform at runtime and installs a
# core set of CLI tools using the appropriate package manager:
#
#   Linux    -> apt-get
#   macOS    -> Homebrew  (installs Homebrew + Xcode CLT if needed)
#
# No OS/version names are hardcoded; we detect capabilities/family at
# runtime and key everything else off the detected package manager.
# ----------------------------------------------------------------------

# Map the raw kernel name to a coarse platform family.
kernel="$(uname -s)"
case "${kernel}" in
  Darwin) pkg_family="macos" ;;
  Linux)  pkg_family="linux" ;;
  *)      pkg_family="unsupported" ;;
esac

echo "==> Detected platform family: ${pkg_family}"

# Packages we always want, keyed by the tool's CLI name so we can probe
# for an existing install regardless of the package manager behind it.
#
# PACKAGES vs. best-effort tools: anything in TOOLS that a package manager may
# not carry is installed best-effort so one missing formula cannot abort the
# whole run (under `set -e` a single `brew install` failure used to kill the
# script and, with it, the rest of `chezmoi apply`).
#
# fastfetch, not neofetch: neofetch was archived upstream and removed from
# homebrew-core, so `brew install neofetch` now fails outright. fastfetch is
# the maintained successor and is packaged for both Homebrew and apt.
TOOLS=(curl git zsh)
OPTIONAL_TOOLS=(fastfetch)

if [ "${pkg_family}" = "linux" ]; then
  # ---------------------------------------------------------------
  # Linux (apt)
  # ---------------------------------------------------------------
  sudo apt-get update -y

  # fastfetch is best-effort: it is present in Homebrew and in recent Ubuntu
  # archives, but not in older ones, so a miss must not abort the run.
  PACKAGES=(
    "${TOOLS[@]}"
    "${OPTIONAL_TOOLS[@]}"
    build-essential  # compiler toolchain (gcc, g++, make)
    # docker
    # nvim
  )

  # Best-effort: apt-get install fails as a unit if any single package is
  # unavailable, so retry the core set alone rather than aborting the run
  # (which would also abort the rest of chezmoi apply via set -e).
  sudo apt-get install -y "${PACKAGES[@]}" || {
    echo "  !! full package set failed; retrying core packages only" >&2
    sudo apt-get install -y "${TOOLS[@]}" build-essential
  }

elif [ "${pkg_family}" = "macos" ]; then
  # ---------------------------------------------------------------
  # macOS (Homebrew + Xcode Command Line Tools)
  # ---------------------------------------------------------------

  # Homebrew requires Apple's Command Line Tools. Can't be installed
  # silently from a script -- it pops a GUI dialog you must accept.
  # We only *trigger* it if the tools are absent; if tools are already
  # present we move on.
  ensure_xcode_clt() {
    if ! xcode-select -p >/dev/null 2>&1; then
      echo "==> Xcode Command Line Tools not found. Starting the installer..."
      echo "    A dialog will appear -- click Install and wait for it to finish."
      xcode-select --install || true
      echo "    Waiting for Command Line Tools to finish installing..."
      # Poll for up to ~10 minutes; if the user declines the dialog we bail
      # out instead of hanging a run_once script forever.
      for _ in $(seq 1 120); do
        if xcode-select -p >/dev/null 2>&1; then
          echo "==> Xcode Command Line Tools ready."
          return 0
        fi
        sleep 5
      done
      echo "error: Command Line Tools not detected after ~10min." >&2
      echo "       Re-run 'chezmoi apply' once you've accepted the installer." >&2
      exit 1
    fi
    echo "==> Xcode Command Line Tools already installed."
  }
  ensure_xcode_clt

  # Install Homebrew, mounting the standard non-interactive installer.
  #
  # Do NOT set NONINTERACTIVE=1 here. It makes Homebrew pass -n to sudo,
  # i.e. never prompt for a password, which aborts on a fresh Mac where
  # /opt/homebrew (or /usr/local) is not yet writable and sudo has no cached
  # credentials:
  #   abort "Insufficient permissions to install Homebrew to ..."
  # Leaving it unset lets Homebrew prompt for the password once. It still
  # falls back to non-interactive automatically when stdin is not a TTY, and
  # that path uses `sudo -v` (prompting) rather than `sudo -n`.
  if ! command -v brew >/dev/null 2>&1; then
    echo "==> Installing Homebrew (may prompt for your password)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  else
    echo "==> Homebrew already installed."
  fi

  # Put brew on PATH for the rest of this script. It may be freshly installed
  # (or simply not on this shell's PATH, since dot_zshrc is only sourced by
  # interactive shells), so resolve the binary at its known install locations
  # before invoking it -- `brew shellenv` cannot be used to *find* brew.
  if ! command -v brew >/dev/null 2>&1; then
    for candidate in /opt/homebrew/bin/brew /usr/local/bin/brew; do
      if [ -x "${candidate}" ]; then
        eval "$("${candidate}" shellenv)"
        break
      fi
    done
  fi

  if ! command -v brew >/dev/null 2>&1; then
    echo "error: Homebrew is not on PATH after installation." >&2
    echo "       Open a new terminal, or add it manually, then re-run:" >&2
    echo "         eval \"\$(/opt/homebrew/bin/brew shellenv)\"" >&2
    exit 1
  fi

  echo "==> Updating Homebrew and installing core packages..."
  brew update

  # build-essential / gcc intentionally omitted on macOS: the Xcode CLT
  # provides clang as the system compiler (see README for the reasoning).
  for tool in "${TOOLS[@]}"; do
    if ! command -v "${tool}" >/dev/null 2>&1; then
      echo "==> Installing ${tool} via Homebrew..."
      brew install "${tool}" || echo "  !! ${tool} failed to install; continuing" >&2
    else
      echo "==> ${tool} already available."
    fi
  done

  for tool in "${OPTIONAL_TOOLS[@]}"; do
    if ! command -v "${tool}" >/dev/null 2>&1; then
      echo "==> Installing optional ${tool} via Homebrew (may be unavailable)..."
      brew install "${tool}" || echo "  !! optional ${tool} not available; skipping" >&2
    else
      echo "==> ${tool} already available."
    fi
  done

else
  echo "Unsupported platform: ${kernel}" >&2
  exit 1
fi
