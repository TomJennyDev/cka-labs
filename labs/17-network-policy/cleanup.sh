#!/usr/bin/env bash
# Lab 17 · NetworkPolicy theo mô hình mặc định chặn
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab17 lab17-mon lab17-other --ignore-not-found --wait=false >/dev/null
