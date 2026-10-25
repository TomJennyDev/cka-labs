#!/usr/bin/env bash
# Lab 05 · Deployment: scale, rolling update, rollback
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl scale deploy shop -n lab05 --replicas=4
kubectl patch deploy shop -n lab05 -p '{"spec":{"revisionHistoryLimit":5,"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}}}'
kubectl set image deploy/shop -n lab05 nginx=nginx:1.28
kubectl annotate deploy/shop -n lab05 kubernetes.io/change-cause='nang cap nginx 1.28' --overwrite
kubectl rollout status deploy/shop -n lab05 --timeout=180s
kubectl set image deploy/shop -n lab05 nginx=nginx:1.99
kubectl annotate deploy/shop -n lab05 kubernetes.io/change-cause='thu nginx 1.99' --overwrite
kubectl rollout status deploy/shop -n lab05 --timeout=20s || true
kubectl rollout undo deploy/shop -n lab05
kubectl rollout status deploy/shop -n lab05 --timeout=180s
kubectl patch deploy legacy -n lab05 -p '{"spec":{"strategy":{"type":"Recreate","rollingUpdate":null}}}'
