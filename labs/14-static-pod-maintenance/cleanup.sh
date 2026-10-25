#!/usr/bin/env bash
# Lab 14 · Static pod, lập lịch thủ công và bảo trì node
# File sinh tự động từ src/labs/level3.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl uncordon "$NODE1" >/dev/null 2>&1 || true
node_exec "$NODE1" "rm -f $(static_dir "$NODE1")/static-web.yaml" >/dev/null 2>&1 || true
kubectl delete ns lab14 --ignore-not-found --wait=false >/dev/null
