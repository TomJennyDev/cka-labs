#!/usr/bin/env bash
# Lab 36 · Troubleshooting node: worker NotReady
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env kind
detect_nodes
answers_dir; rm -f "$ANS/36-file.txt"
node_exec "$NODE2" 'set -e; cp -n /var/lib/kubelet/config.yaml /root/lab36-config.yaml
  sed -i "s#clientCAFile: .*#clientCAFile: /etc/kubernetes/pki/ca-bundle.crt#" /var/lib/kubelet/config.yaml
  systemctl disable --now kubelet'
info "Chờ node $NODE2 chuyển NotReady (khoảng 50 giây)"
wait_for 120 bash -c "[ \"\$(kubectl get node $NODE2 -o jsonpath='{.status.conditions[?(@.type==\"Ready\")].status}')\" != True ]"
echo "✔ Đã dựng xong tình huống."
