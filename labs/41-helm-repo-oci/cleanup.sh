#!/usr/bin/env bash
# Lab 41 · Helm với repo và OCI - Argo CD, sửa release lỗi
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
helm uninstall podinfo shop -n lab41 >/dev/null 2>&1 || true
kubectl delete ns lab41 --ignore-not-found --wait=false >/dev/null
rm -f "$ANS/41-argocd.yaml"
