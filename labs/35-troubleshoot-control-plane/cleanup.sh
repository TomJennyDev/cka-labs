#!/usr/bin/env bash
# Lab 35 · Troubleshooting control plane: scheduler và controller-manager
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
node_exec "$CP" 'if [ -d /root/lab35 ]; then cp /root/lab35/*.yaml /etc/kubernetes/manifests/; rm -rf /root/lab35; fi' >/dev/null 2>&1 || true
kubectl delete ns lab35 --ignore-not-found --wait=false >/dev/null
rm -f "$ANS/35-components.txt"
