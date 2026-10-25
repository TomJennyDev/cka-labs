#!/usr/bin/env bash
# Lab 18 · Ingress, IngressClass và TLS
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab18 --ignore-not-found --wait=false >/dev/null
kubectl delete ingressclass lab-ingress --ignore-not-found >/dev/null
