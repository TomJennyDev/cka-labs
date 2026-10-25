#!/usr/bin/env bash
# Lab 34 · Troubleshooting mạng: Service, NetworkPolicy và DNS
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
orig=$(jp cm lab-state -n lab34 '{.data.coredns}')
[ -z "$orig" ] && orig=$(cat "$ANS/.34-coredns" 2>/dev/null)
[ -n "$orig" ] && kubectl -n kube-system scale deploy coredns --replicas="$orig" >/dev/null 2>&1 \
  && kubectl -n kube-system rollout status deploy coredns --timeout=120s >/dev/null 2>&1
kubectl delete ns lab34 --ignore-not-found --wait=false >/dev/null
rm -f "$ANS/34-faults.txt" "$ANS/.34-coredns"
