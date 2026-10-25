#!/usr/bin/env bash
# Lab 25 · securityContext và Pod Security Admission
# File sinh tự động từ src/labs/level6.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab25 --ignore-not-found --wait=false >/dev/null
