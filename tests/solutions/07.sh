#!/usr/bin/env bash
# Lab 07 · Liveness, readiness và startup probe
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
echo liveness > "$ANS/07-culprit.txt"
kubectl patch deploy slow-api -n lab07 --type=json -p '[
  {"op":"add","path":"/spec/template/spec/containers/0/startupProbe","value":{"httpGet":{"path":"/healthz","port":8080},"periodSeconds":5,"failureThreshold":12}},
  {"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":8080}]'
kubectl patch deploy cache -n lab07 --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/0/readinessProbe","value":{"exec":{"command":["cat","/tmp/ready"]},"periodSeconds":5}}]'
kubectl rollout status deploy/slow-api -n lab07 --timeout=240s
kubectl rollout status deploy/cache -n lab07 --timeout=120s
sleep 5
