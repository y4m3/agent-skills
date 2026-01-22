#!/bin/bash
# Wrapper for Notification hook - calls bell.sh with "Waiting" message
exec bash "$HOME/.claude/hooks/bell.sh" "Waiting"
