#!/usr/bin/env bash
# Lab 26 · Helm từ chart đến rollback
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
mkdir -p "$ANS/lab26" && cd "$ANS/lab26"
helm create webapp
helm install web ./webapp -n lab26 --set replicaCount=2,image.tag=1.27 --wait --timeout 3m
helm upgrade web ./webapp -n lab26 --reuse-values --set service.type=NodePort --wait
helm upgrade web ./webapp -n lab26 --reuse-values --set image.tag=1.99 || true
helm rollback web 2 -n lab26 --wait
helm template preview ./webapp --set replicaCount=3 > "$ANS/26-rendered.yaml"
helm install tmp ./webapp -n lab26
helm uninstall tmp -n lab26
