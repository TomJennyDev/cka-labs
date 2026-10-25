#!/usr/bin/env bash
# Lab 44 · Gateway API với controller thật - HTTPS và chuyển từ Ingress
# File sinh tự động từ src/labs/level4-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab44 --ignore-not-found --wait=false >/dev/null
