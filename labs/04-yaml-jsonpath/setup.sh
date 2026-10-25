#!/usr/bin/env bash
# Lab 04 · Sinh YAML nhanh và trích xuất bằng jsonpath
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS"/04-*
ns_fresh lab04
kubectl run cache -n lab04 --image=busybox:1.36 --command -- sleep 3600 >/dev/null
echo "✔ Đã dựng xong tình huống."
