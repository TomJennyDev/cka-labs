#!/usr/bin/env bash
# Lab 37 · Theo dõi tài nguyên, event và log
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
for i in $(seq 1 30); do kubectl top pod -n lab37 --no-headers 2>/dev/null | grep -q burner && break; sleep 5; done
kubectl top pod -n lab37 --sort-by=cpu --no-headers | head -1 | awk '{print $1}' > "$ANS/37-cpu.txt"
kubectl logs crashy -n lab37 --previous | grep FATAL > "$ANS/37-fatal.txt"
kubectl get pod crashy -n lab37 -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}' > "$ANS/37-exit.txt"
kubectl logs multi -n lab37 -c proxy | grep -c 'upstream timeout' > "$ANS/37-timeouts.txt"
kubectl get events -n lab37 --field-selector involvedObject.name=crashy,type=Warning --sort-by=.lastTimestamp -o jsonpath='{.items[-1:].reason}' > "$ANS/37-event.txt"
