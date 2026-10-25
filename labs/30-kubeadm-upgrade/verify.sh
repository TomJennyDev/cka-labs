#!/usr/bin/env bash
# Lab 30 · Nâng cấp cluster kubeadm 1.36 → 1.37
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 30 "Nâng cấp cluster kubeadm 1.36 → 1.37"
expect_match "30-target.txt là v1.37.x" "$(ans 30-target.txt)" '^v1\.37\.[0-9]+$'
for n in $(kubectl get nodes -o name | cut -d/ -f2); do
  expect_match "$n chạy kubelet v1.37" "$(jp node "$n" '{.status.nodeInfo.kubeletVersion}')" '^v1\.37\.'
  expect_match "$n không bị cordon" "$(jp node "$n" '{.spec.unschedulable}')" '^(false)?$'
done
expect_match "kube-apiserver dùng image v1.37" "$(jp pod "kube-apiserver-$CP" -n kube-system '{.spec.containers[0].image}')" ':v1\.37\.'
ready=$(kubectl get nodes --no-headers | awk '$2=="Ready"' | wc -l); total=$(kubectl get nodes --no-headers | wc -l)
expect "Mọi node Ready" "$ready" "$total"
end_verify
