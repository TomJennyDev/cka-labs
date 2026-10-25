#!/usr/bin/env bash
# Lab 29 · Sao lưu và khôi phục etcd
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab29-before lab29-after --ignore-not-found --wait=false >/dev/null 2>&1
