#!/usr/bin/env bash
# Lab 40 · Cài CNI Calico bằng Tigera Operator
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
cur="$(kubectl config current-context 2>/dev/null)"
kind delete cluster --name cka-cni >/dev/null 2>&1 || true
if [ -z "$cur" ] || [ "$cur" = kind-cka-cni ]; then kubectl config use-context kind-cka >/dev/null 2>&1 || true; fi
rm -f "$ANS/40-pod-cidr.txt"
