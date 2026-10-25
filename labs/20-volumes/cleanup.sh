#!/usr/bin/env bash
# Lab 20 · Volume: emptyDir, hostPath, projected và Downward API
# File sinh tự động từ src/labs/level5.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab20 --ignore-not-found --wait=false >/dev/null
node_exec "$NODE1" 'rm -rf /var/log/lab20' >/dev/null 2>&1 || true
