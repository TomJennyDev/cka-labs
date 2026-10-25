#!/usr/bin/env bash
# Lab 12 · nodeSelector, node affinity, taint và toleration
# File sinh tự động từ src/labs/level3.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
ns_fresh lab12
kubectl label node "$NODE1" "$NODE2" disktype- accelerator- >/dev/null 2>&1 || true
kubectl taint node "$NODE2" dedicated- >/dev/null 2>&1 || true
echo "✔ Đã dựng xong tình huống."
