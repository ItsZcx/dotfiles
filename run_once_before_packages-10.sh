#!/usr/bin/env bash
set -euo pipefail

echo "==> Updating apt and installing core CLI packages..."
sudo apt-get update -y

# Add any packages you want on every machine
PACKAGES=(
    curl
    git
    zsh
    build-essential
    neofetch
    # docker
    # nvim
)

sudo apt-get install -y "${PACKAGES[@]}"
