#!/usr/bin/env bash
#
# install.sh — interactive setup for optional features bundled with the
# dotfiles. Core files (.zshrc, .gitconfig) and the unconditional run_once
# installers (oh-my-zsh, core packages, zoxide) are ALWAYS applied by chezmoi.
# This menu lets you pick which *optional* things to configure per machine.
#
# Controls (interactive checkbox list):
#   Up / Down : move the highlight
#   Space     : toggle the highlighted item
#   Enter     : run installs for every checked item
#   q / Esc   : quit without installing
#
# It is idempotent, so re-running is safe.
#
# NOTE: run from anywhere; it locates itself relative to the source checkout.
set -euo pipefail

# ---------------------------------------------------------------------------
# Locate the source checkout this script lives in.
# ---------------------------------------------------------------------------
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPTIONAL_DIR="${SOURCE_DIR}/optional"

# ---------------------------------------------------------------------------
# Feature manifest.
#
# Each optional feature is defined here with its ID, human label, and runner
# function name. Using parallel indexed arrays ensures full compatibility
# with legacy Bash 3.2 (default on macOS) which lacks associative arrays (-A).
FEATURE_IDS=(
  "pi"
  "pi-skills"
  "pi-extensions"
  "pi-agents"
  "pi-guard"
  "pi-prompts"
  "pi-web-access"
)

FEATURE_LABELS=(
  "Pi: deploy ~/.pi/agent/settings.json (provider & model)"
  "Pi: install curated skills (tdd, diagnosing-bugs, research, ...)"
  "Pi: install extensions (btw side-chat, subagent delegation)"
  "Pi: install subagent definitions (scout, planner, reviewer, worker)"
  "Pi: git guardrail — never push; commit only when told"
  "Pi: prompt templates (e.g. /commit conventional commits)"
  "Pi: install pi-web-access (web_search tools) + config (paste TinyFish key, never commit)"
)

FEATURE_RUNNERS=(
  "deploy_pi"
  "deploy_pi_skills"
  "deploy_pi_extensions"
  "deploy_pi_agents"
  "deploy_pi_guard"
  "deploy_pi_prompts"
  "deploy_pi_web_access"
)

FEATURE_ORDER=("${FEATURE_IDS[@]}")

# ---------------------------------------------------------------------------
# Feature installer: pi
# ---------------------------------------------------------------------------
# Back up any existing file that differs, then copy src over dst.
deploy_pi_file() {
  local src="$1" dst="$2"
  if [ ! -f "${src}" ]; then
    echo "  !! missing ${src}; skipping" >&2
    return 1
  fi
  mkdir -p "$(dirname "${dst}")"
  if [ -f "${dst}" ] && ! cmp -s "${src}" "${dst}"; then
    cp "${dst}" "${dst}.orig.$(date +%Y%m%d%H%M%S)"
    echo "  -> backed up previous ${dst}"
  fi
  cp "${src}" "${dst}"
  echo "  -> wrote ${dst}"
}

deploy_pi() {
  deploy_pi_file "${OPTIONAL_DIR}/pi/agent-settings.json" "${HOME}/.pi/agent/settings.json"
  deploy_pi_file "${OPTIONAL_DIR}/pi/keybindings.json" "${HOME}/.pi/agent/keybindings.json"

  cat <<'EOF'

  API keys are intentionally NOT versioned. Inside the pi session run:
      /login
  (or export the relevant key, e.g. DEEPSEEK_API_KEY=..., before launching pi)
EOF
}

# Generic helper: copy files from a repo dir into a pi agent dir, without
# overwriting anything that already exists locally.
deploy_pi_tree() {
  local src="$1" dst="$2"
  if [ ! -d "${src}" ]; then
    echo "  !! missing ${src}; skipping" >&2
    return 1
  fi
  mkdir -p "${dst}"
  local n=0
  for item in "${src}"/*; do
    [ -e "${item}" ] || continue
    local name
    name="$(basename "${item}")"
    if [ -e "${dst}/${name}" ]; then
      echo "  !! ${name} already present; keeping existing" >&2
    else
      cp -R "${item}" "${dst}/"
      echo "  -> installed: ${name}"
      n=$((n+1))
    fi
  done
  if [ "$n" = "0" ]; then
    echo "  (nothing new — all already present or none found)"
  fi
}

# ---------------------------------------------------------------------------
# Feature installer: pi skills
# ---------------------------------------------------------------------------
deploy_pi_skills() {
  deploy_pi_tree "${OPTIONAL_DIR}/pi/skills" "${HOME}/.pi/agent/skills"
  echo "  Skills load automatically on pi startup."
  echo "  NOTE: /implement and friends also need the pi-agents feature for"
  echo "        their scout/planner/reviewer/worker definitions to resolve."
}

# ---------------------------------------------------------------------------
# Feature installer: pi extensions (btw, subagent, ...)
# ---------------------------------------------------------------------------
# Non-overwriting tree copy: an existing extension of the same name is kept,
# so a locally-tweaked btw.ts or subagent/ is never clobbered. git-guard.ts is
# deliberately NOT deployed here — it belongs to the pi-guard feature, which
# uses a forced copy so guardrail updates actually land.
deploy_pi_extensions() {
  local src="${OPTIONAL_DIR}/pi/extensions" dst="${HOME}/.pi/agent/extensions"
  if [ ! -d "${src}" ]; then
    echo "  !! missing ${src}; skipping" >&2
    return 1
  fi
  mkdir -p "${dst}"
  local n=0 item name
  for item in "${src}"/*; do
    [ -e "${item}" ] || continue
    name="$(basename "${item}")"
    [ "${name}" = "git-guard.ts" ] && continue   # owned by pi-guard
    if [ -e "${dst}/${name}" ]; then
      echo "  !! ${name} already present; keeping existing" >&2
    else
      cp -R "${item}" "${dst}/"
      echo "  -> installed: ${name}"
      n=$((n+1))
    fi
  done
  [ "$n" = "0" ] && echo "  (nothing new — all already present or none found)"
  echo "  Restart pi (or run /reload) for extensions to load."
}

# ---------------------------------------------------------------------------
# Feature installer: pi subagent definitions
# ---------------------------------------------------------------------------
# The subagent extension discovers agents in ~/.pi/agent/agents. The prompts
# that drive them (/implement, /scout-and-plan, /implement-and-review) expect
# scout/planner/reviewer/worker to exist, so install them alongside.
deploy_pi_agents() {
  deploy_pi_tree "${OPTIONAL_DIR}/pi/agents" "${HOME}/.pi/agent/agents"
}

# ---------------------------------------------------------------------------
# Feature installer: pi guardrail extension
# ---------------------------------------------------------------------------
deploy_pi_guard() {
  # Forced copy (with timestamped backup) so guardrail fixes actually reach a
  # machine that already has an older git-guard.ts. Everything else in
  # extensions/ is handled by the pi-extensions feature.
  deploy_pi_file "${OPTIONAL_DIR}/pi/extensions/git-guard.ts" "${HOME}/.pi/agent/extensions/git-guard.ts"
  # Standing instruction: never commit unless the user asks. Overwrites (with a
  # timestamped backup) so policy updates actually land.
  deploy_pi_file "${OPTIONAL_DIR}/pi/APPEND_SYSTEM.md" "${HOME}/.pi/agent/APPEND_SYSTEM.md"
  echo "  Restart pi (or run /reload) for the git guardrail to take effect."
}

# ---------------------------------------------------------------------------
# Feature installer: pi prompt templates
# ---------------------------------------------------------------------------
deploy_pi_prompts() {
  deploy_pi_tree "${OPTIONAL_DIR}/pi/prompts" "${HOME}/.pi/agent/prompts"
  echo "  Type /commit (and others) in pi to use them."
  echo "  NOTE: /implement, /scout-and-plan and /implement-and-review drive the"
  echo "        subagent extension and need the pi-extensions + pi-agents features."
}

# ---------------------------------------------------------------------------
# Feature installer: pi web access (pi-web-access: web_search tools + config)
# ---------------------------------------------------------------------------
# Two jobs:
#   1. Install the pi-web-access CLI package (registers web_search etc.) by
#      running:  pi install npm:pi-web-access   — skipped if already installed,
#      and reports gracefully if the pi CLI can't be run now.
#   2. Seed ~/.pi/agent/web-search.json from the repo template ONLY if it is
#      not already present (never overwrites a real pasted key). The template
#      has tinyfishApiKey empty so search falls back to zero-config Exa until
#      you paste a key in the live file.
deploy_pi_web_access() {
  local src="${OPTIONAL_DIR}/pi/web-search.json"
  local dst="${HOME}/.pi/agent/web-search.json"

  # --- 1. pi CLI package -------------------------------------------------
  if command -v pi >/dev/null 2>&1; then
    if pi list 2>/dev/null | grep -q 'pi-web-access'; then
      echo "  -> pi-web-access package already installed; skipping 'pi install'"
    else
      echo "  -> installing pi-web-access package (pi install npm:pi-web-access)..."
      pi install npm:pi-web-access || echo "  !! pi install failed; re-run later with: pi install npm:pi-web-access" >&2
    fi
  else
    echo "  !! 'pi' not on PATH; skipping package install." >&2
    echo "     Install it later with: pi install npm:pi-web-access"
  fi

  # --- 2. web-search.json config -----------------------------------------
  if [ ! -f "${src}" ]; then
    echo "  !! missing ${src}; skipping" >&2
    return 1
  fi
  mkdir -p "$(dirname "${dst}")"
  if [ -f "${dst}" ]; then
    echo "  -> ${dst} already exists; keeping it (not overwriting a pasted key)"
  else
    cp "${src}" "${dst}"
    echo "  -> wrote ${dst}"
  fi
  cat <<'EOF'

  pi-web-access installed: provides the web_search, source_check, fetch_content,
  and get_search_content tools, plus the /websearch, /curator, /search commands.
  Config: ~/.pi/agent/web-search.json — tinyfishApiKey empty, so searches use
  zero-config Exa until you paste a key in that file:
        "tinyfishApiKey": "<YOUR-TINYFISH-KEY>"
  Keep the repo copy empty/placeholder - never commit your real key, and this
  installer will not overwrite a pasted key.
EOF
}


# ---------------------------------------------------------------------------
# Interactive checkbox menu (ASCII, portable)
# ---------------------------------------------------------------------------
HIGHLIGHT_ON=$'\x1b[7m'    # reverse video
HIGHLIGHT_OFF=$'\x1b[0m'

declare -a checked            # 0 or 1 per FEATURE_ORDER entry
current=0

init_checks() { for ((i=0;i<${#FEATURE_ORDER[@]};i++)); do checked[$i]=0; done; }

redraw() {
  # Move cursor home, clear, then paint the whole list.
  printf '\x1b[2J\x1b[H'
  echo "Choose optional features (Up/Down move, Space toggle, Enter run, q quit):"
  echo
  local i mark row
  for ((i=0;i<${#FEATURE_ORDER[@]};i++)); do
    [ "${checked[$i]}" = "1" ] && mark='[x]' || mark='[ ]'
    if [ "$i" -eq "$current" ]; then
      printf '%s %s %s %s\n' "$HIGHLIGHT_ON" "$i" "$mark" "${FEATURE_LABELS[$i]}$HIGHLIGHT_OFF"
    else
      printf '  %d %s %s\n' "$i" "$mark" "${FEATURE_LABELS[$i]}"
    fi
  done
  echo
  echo "(core .zshrc/.gitconfig and the unconditional installers already ran via chezmoi)"
}

# Read one keypress; returns up/down/space/enter/quit/other.
read_key() {
  local k esc
  IFS= read -r -n1 -s k
  if [ "$k" = $'\x1b' ]; then
    read -r -n1 -s k
    if [ "$k" = '[' ]; then
      read -r -n1 -s k
      case "$k" in
        A) printf 'up' ;;
        B) printf 'down' ;;
        *) printf 'other' ;;
      esac
    else
      printf 'quit'   # Esc alone
    fi
  else
    case "$k" in
      ' ') printf 'space' ;;
      '')  printf 'enter' ;;
      q|Q) printf 'quit' ;;
      *)   printf 'other' ;;
    esac
  fi
}

main() {
  init_checks
  local n="${#FEATURE_ORDER[@]}"
  local nsel=0

  if [ ! -t 0 ] || [ ! -t 1 ]; then
    echo "no TTY: defaulting to enabling ALL optional features"
    for ((i=0;i<n;i++)); do checked[$i]=1; done
    nsel=${n}
  else
    redraw
    while :; do
      case "$(read_key)" in
        up)    ((current>0)) && current=$((current-1)); redraw ;;
        down)  ((current<n-1)) && current=$((current+1)); redraw ;;
        space) checked[current]=$((1-checked[current])); redraw ;;
        enter) break ;;
        quit)  printf '\x1b[2J\x1b[H'; echo "cancelled — no changes made"; exit 0 ;;
        *) : ;;
      esac
    done
    # leave clean screen
    printf '\x1b[2J\x1b[H'
  fi

  # Execute selected features.
  local any=0
  for ((i=0;i<n;i++)); do
    if [ "${checked[$i]}" = "1" ]; then
      any=1
      local id="${FEATURE_ORDER[$i]}"
      echo ""; echo "==> Enabling optional feature: ${id}"
      "${FEATURE_RUNNERS[$i]}" || true
    fi
  done

  if [ "$any" = "0" ]; then
    echo; echo "No optional features selected. Core setup is already applied."
  else
    echo; echo "Done configuring optional features."
  fi
}

main "$@"
