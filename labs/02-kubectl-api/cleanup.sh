#!/usr/bin/env bash
# Lab 02 · kubectl, namespace, context và Kubernetes API
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab02 lab02-apps --ignore-not-found --wait=false >/dev/null
kubectl config delete-context lab02-ctx >/dev/null 2>&1 || true
rm -f "$ANS"/02-*.txt
