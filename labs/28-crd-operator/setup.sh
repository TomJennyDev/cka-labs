#!/usr/bin/env bash
# Lab 28 · CustomResourceDefinition và Operator
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS/28-short.txt"
kubectl delete crd backups.ops.example.com --ignore-not-found --wait=true >/dev/null
ns_fresh lab28
echo "✔ Đã dựng xong tình huống."
