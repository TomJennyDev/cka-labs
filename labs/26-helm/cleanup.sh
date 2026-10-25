#!/usr/bin/env bash
# Lab 26 · Helm từ chart đến rollback
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
helm uninstall web tmp -n lab26 >/dev/null 2>&1 || true
kubectl delete ns lab26 --ignore-not-found --wait=false >/dev/null
rm -rf "$ANS/lab26" "$ANS/26-rendered.yaml"
