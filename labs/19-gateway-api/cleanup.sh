#!/usr/bin/env bash
# Lab 19 · Gateway API, HTTPRoute và ReferenceGrant
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab19-infra lab19-app --ignore-not-found --wait=false >/dev/null
kubectl delete gatewayclass lab-gc --ignore-not-found >/dev/null 2>&1
