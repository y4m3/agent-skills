#!/bin/bash
# Wrapper for Stop hook - calls bell.sh with "Complete" message
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
exec bash "$script_dir/bell.sh" "Complete"
