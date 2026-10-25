#!/usr/bin/env bash
# Lab 05 · Deployment: scale, rolling update, rollback
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab05 --ignore-not-found --wait=false >/dev/null
