#!/usr/bin/env bash
# Lab 37 · Theo dõi tài nguyên, event và log
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab37 --ignore-not-found --wait=false >/dev/null
rm -f "$ANS"/37-*
