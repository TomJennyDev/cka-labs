#!/usr/bin/env bash
# Lab 20 · Volume: emptyDir, hostPath, projected và Downward API
# File sinh tự động từ src/labs/level5.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env kind
detect_nodes
ns_fresh lab20
node_exec "$NODE1" 'rm -rf /var/log/lab20' >/dev/null 2>&1 || true
kubectl create cm app-cfg -n lab20 --from-literal=feature.flags=beta >/dev/null
echo "✔ Đã dựng xong tình huống."
