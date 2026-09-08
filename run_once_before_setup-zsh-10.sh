#!/usr/bin/env bash
set -euo pipefail

# Install Oh My Zsh non-interactively
if [ ! -d "${HOME}/.oh-my-zsh" ]; then
  echo "==> Installing Oh My Zsh..."
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi
