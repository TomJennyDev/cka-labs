#!/usr/bin/env bash
# Lab 03 · Pod, label, log và exec
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl run web -n lab03 --image=nginx:1.27 --labels=app=web,tier=front --port=80
kubectl run worker -n lab03 --image=busybox:1.36 --env=MODE=lab --command -- sh -c 'echo started; sleep 3600'
kubectl logs noisy -n lab03 | grep ERROR > "$ANS/03-errors.txt"
kubectl set image pod/broken -n lab03 app=nginx:1.27
kubectl wait --for=condition=Ready pod/web pod/broken -n lab03 --timeout=90s
kubectl exec web -n lab03 -- hostname > "$ANS/03-hostname.txt"
kubectl delete pod old -n lab03 --force --grace-period 0
