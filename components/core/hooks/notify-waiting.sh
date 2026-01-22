#!/bin/bash
# Wrapper for Notification hook - calls bell.sh with "Waiting" message
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
exec bash "$script_dir/bell.sh" "Waiting"
