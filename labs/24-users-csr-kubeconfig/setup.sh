#!/usr/bin/env bash
# Lab 24 · User mới bằng chứng chỉ, CSR và kubeconfig
# File sinh tự động từ src/labs/level6.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS"/dev1.* "$ANS/ca.crt"
ns_fresh lab24
kubectl delete csr dev1 --ignore-not-found >/dev/null
echo "✔ Đã dựng xong tình huống."
