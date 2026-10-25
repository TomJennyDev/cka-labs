#!/usr/bin/env bash
# Lab 16 · DNS trong cluster và CoreDNS
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab16 --ignore-not-found --wait=false >/dev/null
if [ -s "$ANS/.16-coredns-backup.yaml" ]; then
  kubectl replace -f "$ANS/.16-coredns-backup.yaml" >/dev/null 2>&1 && kubectl -n kube-system rollout restart deploy coredns >/dev/null 2>&1
fi
rm -f "$ANS"/16-* "$ANS/.16-coredns-backup.yaml"
