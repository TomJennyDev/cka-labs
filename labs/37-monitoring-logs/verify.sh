#!/usr/bin/env bash
# Lab 37 · Theo dõi tài nguyên, event và log
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 37 "Theo dõi tài nguyên, event và log"
top=$(kubectl top pod -n lab37 --sort-by=cpu --no-headers 2>/dev/null | head -1 | awk '{print $1}')
expect "37-cpu.txt" "$(ans 37-cpu.txt)" "$top"
expect "37-fatal.txt" "$(ansraw 37-fatal.txt | sed '/^$/d')" "FATAL db unreachable after 3 retries"
expect "37-exit.txt" "$(ans 37-exit.txt)" "3"
expect "37-timeouts.txt" "$(ans 37-timeouts.txt)" "5"
expect "37-event.txt" "$(ans 37-event.txt)" "BackOff"
end_verify
