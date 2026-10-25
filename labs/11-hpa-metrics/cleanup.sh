#!/usr/bin/env bash
# Lab 11 · metrics-server và HorizontalPodAutoscaler
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab11 --ignore-not-found --wait=false >/dev/null
rm -f "$ANS/11-top-pod.txt"
