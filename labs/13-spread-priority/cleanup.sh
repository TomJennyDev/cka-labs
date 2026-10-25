#!/usr/bin/env bash
# Lab 13 · Anti-affinity, topology spread và PriorityClass
# File sinh tự động từ src/labs/level3.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab13 --ignore-not-found --wait=false >/dev/null
kubectl delete pc critical-app team-default --ignore-not-found >/dev/null
rm -f "$ANS/13-default-pc.txt"
