#!/usr/bin/env bash
# Lab 33 · Troubleshooting ứng dụng: sáu Deployment hỏng
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab33 --ignore-not-found --wait=false >/dev/null
rm -f "$ANS/33-oom.txt"
