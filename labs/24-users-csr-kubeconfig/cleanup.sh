#!/usr/bin/env bash
# Lab 24 · User mới bằng chứng chỉ, CSR và kubeconfig
# File sinh tự động từ src/labs/level6.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab24 --ignore-not-found --wait=false >/dev/null
kubectl delete csr dev1 --ignore-not-found >/dev/null
rm -f "$ANS"/dev1.* "$ANS/ca.crt"
