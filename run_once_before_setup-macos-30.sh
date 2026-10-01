#!/usr/bin/env bash
set -euo pipefail

# macOS-only: apply personal system defaults.
#
# These are host-wide `defaults write` calls that need no third-party app and
# are idempotent, so this runs automatically (before the other files) on every
# macOS machine set up with these dotfiles. On non-macOS it is a no-op, which
# keeps the repo cross-platform.
#
# NOTE: `defaults write` only changes the on-disk preference; some settings only
# take effect after the affected app restarts. The Dock, Finder and SystemUIServer
# are restarted at the end, but key-repeat changes need a logout to fully apply.
if [ "$(uname -s)" != "Darwin" ]; then
  echo "==> Not macOS; skipping system defaults."
  exit 0
fi

echo "==> Applying macOS system defaults..."

# --- Appearance -----------------------------------------------------------
# Dark mode and the dark menu-bar/icon theme.
defaults write NSGlobalDomain AppleInterfaceStyle -string Dark
defaults write NSGlobalDomain AppleIconAppearanceTheme -string RegularDark

# Keep the menu bar visible in fullscreen apps.
defaults write NSGlobalDomain AppleMenuBarVisibleInFullscreen -int 1

# --- Keyboard -------------------------------------------------------------
# Fast key repeat. KeyRepeat is the repeat interval in ms (2 = 30/s, the floor
# the UI exposes); InitialKeyRepeat is the delay before repeat starts (30 =
# 450ms). These need a logout to fully apply.
defaults write NSGlobalDomain KeyRepeat -int 2
defaults write NSGlobalDomain InitialKeyRepeat -int 30

# --- Trackpad / mouse -----------------------------------------------------
# Tap to click, and a silent (non-clicking) secondary tap for right-click.
# These live in the per-host domain.
defaults -currentHost write -g com.apple.mouse.tapBehavior -int 1
defaults -currentHost write -g com.apple.trackpad.enableSecondaryClick -int 0
# Cursor tracking speed (1.0 is the default; 0.875 is slightly slower).
defaults write NSGlobalDomain com.apple.trackpad.scaling -float 0.875

# --- Dock ----------------------------------------------------------------
# Auto-hide the Dock so it stays out of the way of the tiling window manager.
defaults write com.apple.dock autohide -bool true

# Stop Mission Control from reordering Spaces by recent use. AeroSpace manages
# workspaces itself, so Space order must stay stable underneath it.
defaults write com.apple.dock mru-spaces -bool false

# Icon size and no "recent apps" section.
defaults write com.apple.dock tilesize -int 62
defaults write com.apple.dock show-recents -bool false

# --- Finder ---------------------------------------------------------------
# Show dotfiles in Finder.
defaults write com.apple.finder AppleShowAllFiles -bool true

# Show external disks and removable media on the desktop.
defaults write com.apple.finder ShowExternalHardDrivesOnDesktop -bool true
defaults write com.apple.finder ShowRemovableMediaOnDesktop -bool true

# --- Desktop & Stage Manager ---------------------------------------------
# Disable "click wallpaper to reveal desktop" (avoids accidental desktop
# reveals while AeroSpace manages windows).
defaults write com.apple.WindowManager EnableStandardClickToShowDesktop -bool false

# --- Menu bar clock -------------------------------------------------------
# Show seconds, the date, and the day of the week.
defaults write com.apple.menuextra.clock ShowSeconds -bool true
defaults write com.apple.menuextra.clock ShowDate -bool true
defaults write com.apple.menuextra.clock ShowDayOfWeek -bool true

# --- Apply changes --------------------------------------------------------
# Restart the affected processes so the writes above take effect. Best-effort:
# a process may not be running (e.g. over SSH), and `set -e` must not abort the
# rest of `chezmoi apply` for that.
killall Dock 2>/dev/null || true
killall Finder 2>/dev/null || true
killall SystemUIServer 2>/dev/null || true

echo "==> System defaults applied (some key-repeat settings apply after logout)."
