#!/usr/bin/env bash
# Lab 04 · Sinh YAML nhanh và trích xuất bằng jsonpath
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab04 --ignore-not-found --wait=false >/dev/null
rm -f "$ANS"/04-*
