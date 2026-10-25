#!/usr/bin/env bash
# Lab 13 · Anti-affinity, topology spread và PriorityClass
# File sinh tự động từ src/labs/level3.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS/13-default-pc.txt"
ns_fresh lab13
kubectl delete pc critical-app team-default --ignore-not-found >/dev/null
kubectl create priorityclass team-default --value=1000 --global-default=true --description="lab13 default" >/dev/null
echo "✔ Đã dựng xong tình huống."
