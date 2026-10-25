#!/usr/bin/env bash
# Lab 10 · Requests, limits, LimitRange và ResourceQuota
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab10 --ignore-not-found --wait=false >/dev/null
rm -f "$ANS/10-quota.txt"
