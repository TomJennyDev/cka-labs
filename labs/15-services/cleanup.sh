#!/usr/bin/env bash
# Lab 15 · Service, EndpointSlice và kết nối giữa các Pod
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab15 --ignore-not-found --wait=false >/dev/null
rm -f "$ANS/15-web-ip.txt"
