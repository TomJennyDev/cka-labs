#!/usr/bin/env bash
# Lab 25 · securityContext và Pod Security Admission
# File sinh tự động từ src/labs/level6.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
ns_fresh lab25
kubectl create deploy api -n lab25 --image=busybox:1.36 -- sleep 3600 >/dev/null
kubectl rollout status deploy/api -n lab25 --timeout=120s >/dev/null
sleep 1
kubectl create cm lab-state -n lab25 --from-literal=t0="$(date -u +%Y-%m-%dT%H:%M:%SZ)" >/dev/null
echo "✔ Đã dựng xong tình huống."
