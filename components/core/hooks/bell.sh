#!/bin/bash
# Claude Code notification hook
# Usage: bell.sh [event_type]
# - tmux bell: status bar indicator (◆)
# - OSC 9: WezTerm desktop notification (works over SSH)

event="${1:-Task}"

# 1. tmux bell - send to all panes
for tty in $(tmux list-panes -a -F '#{pane_tty}' 2>/dev/null); do
  printf '\a' > "$tty" 2>/dev/null
done

# 2. OSC 9 desktop notification (requires terminal)
if [[ -e /dev/tty ]]; then
  timestamp=$(date +%H:%M)
  msg="Claude Code: ${event} (${timestamp})"
  osc=$'\e]9;'"${msg}"$'\e\\'

  # Wrap for tmux passthrough
  if [[ -n "${TMUX:-}" ]]; then
    osc=$'\ePtmux;\e'"${osc}"$'\e\\'
  fi

  printf '%s' "$osc" > /dev/tty 2>/dev/null
fi
