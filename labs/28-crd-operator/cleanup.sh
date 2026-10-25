#!/usr/bin/env bash
# Lab 28 · CustomResourceDefinition và Operator
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab28 --ignore-not-found --wait=false >/dev/null
kubectl delete crd backups.ops.example.com --ignore-not-found >/dev/null
rm -f "$ANS/28-short.txt"
