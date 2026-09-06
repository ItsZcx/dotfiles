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
TOOLS=(curl git zsh neofetch)

if [ "${pkg_family}" = "linux" ]; then
  # ---------------------------------------------------------------
  # Linux (apt)
  # ---------------------------------------------------------------
  sudo apt-get update -y

  PACKAGES=(
    "${TOOLS[@]}"
    build-essential  # compiler toolchain (gcc, g++, make)
    # docker
    # nvim
  )

  sudo apt-get install -y "${PACKAGES[@]}"

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
  if ! command -v brew >/dev/null 2>&1; then
    echo "==> Installing Homebrew..."
    NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  else
    echo "==> Homebrew already installed."
  fi

  # Put brew on PATH for the rest of this script (it may be freshly
  # installed and not yet on this shell's PATH). Resolve dynamically.
  eval "$(brew shellenv 2>/dev/null || true)"

  echo "==> Updating Homebrew and installing core packages..."
  brew update

  # build-essential / gcc intentionally omitted on macOS: the Xcode CLT
  # provides clang as the system compiler (see README for the reasoning).
  for tool in "${TOOLS[@]}"; do
    if ! command -v "${tool}" >/dev/null 2>&1; then
      echo "==> Installing ${tool} via Homebrew..."
      brew install "${tool}"
    else
      echo "==> ${tool} already available."
    fi
  done

else
  echo "Unsupported platform: ${kernel}" >&2
  exit 1
fi
