#!/usr/bin/env bash
# Lab 03 · Pod, label, log và exec
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab03 --ignore-not-found --wait=false >/dev/null
rm -f "$ANS"/03-*.txt
