#!/usr/bin/env bash
# Lab 17 · NetworkPolicy theo mô hình mặc định chặn
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
kubectl delete ns lab17 lab17-mon lab17-other --ignore-not-found --wait=true >/dev/null 2>&1
kubectl create ns lab17 >/dev/null
kubectl create ns lab17-mon >/dev/null; kubectl label ns lab17-mon purpose=monitoring >/dev/null
kubectl create ns lab17-other >/dev/null
for a in web api db; do
  kubectl create deploy "$a" -n lab17 --image=nginx:1.27 >/dev/null
  kubectl expose deploy "$a" -n lab17 --port=80 >/dev/null
done
kubectl rollout status deploy/web deploy/api deploy/db -n lab17 --timeout=120s >/dev/null 2>&1 || true
echo "✔ Đã dựng xong tình huống."
