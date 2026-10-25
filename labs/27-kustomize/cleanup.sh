#!/usr/bin/env bash
# Lab 27 · Kustomize với base và overlay
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab27 --ignore-not-found --wait=false >/dev/null
rm -rf "$ANS/lab27" "$ANS/27-rendered.yaml"
