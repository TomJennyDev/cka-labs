#!/usr/bin/env bash
# Lab 42 · Cài và dùng một Operator thật - cert-manager
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab42 --ignore-not-found --wait=false >/dev/null
kubectl delete clusterissuer selfsigned --ignore-not-found >/dev/null 2>&1 || true
rm -f "$ANS/42-crds.txt" "$ANS/42-subject.txt"
