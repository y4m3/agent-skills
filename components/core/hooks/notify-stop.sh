#!/bin/bash
# Wrapper for Stop hook - calls bell.sh with "Complete" message
exec bash "$HOME/.claude/hooks/bell.sh" "Complete"
