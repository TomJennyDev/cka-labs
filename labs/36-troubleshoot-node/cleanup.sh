#!/usr/bin/env bash
# Lab 36 · Troubleshooting node: worker NotReady
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
node_exec "$NODE2" 'if [ -f /root/lab36-config.yaml ]; then cp /root/lab36-config.yaml /var/lib/kubelet/config.yaml; rm -f /root/lab36-config.yaml; fi; systemctl enable --now kubelet; systemctl restart kubelet' >/dev/null 2>&1 || true
rm -f "$ANS/36-file.txt"
