#!/usr/bin/env bash
# Lab 05 · Deployment: scale, rolling update, rollback
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
ns_fresh lab05
kubectl create deploy shop -n lab05 --image=nginx:1.27 --replicas=2 >/dev/null
kubectl annotate deploy/shop -n lab05 kubernetes.io/change-cause='ban dau nginx 1.27' >/dev/null
kubectl create deploy legacy -n lab05 --image=nginx:1.27 >/dev/null
kubectl rollout status deploy/shop -n lab05 --timeout=120s >/dev/null
echo "✔ Đã dựng xong tình huống."
