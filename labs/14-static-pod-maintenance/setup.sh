#!/usr/bin/env bash
# Lab 14 · Static pod, lập lịch thủ công và bảo trì node
# File sinh tự động từ src/labs/level3.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env kind
detect_nodes
ns_fresh lab14
kubectl uncordon "$NODE1" >/dev/null 2>&1 || true
node_exec "$NODE1" "rm -f $(static_dir "$NODE1")/static-web.yaml" >/dev/null 2>&1 || true
kubectl create deploy web -n lab14 --image=nginx:1.27 --replicas=3 >/dev/null
kubectl rollout status deploy/web -n lab14 --timeout=120s >/dev/null
echo "✔ Đã dựng xong tình huống."
