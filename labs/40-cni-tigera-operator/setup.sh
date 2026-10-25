#!/usr/bin/env bash
# Lab 40 · Cài CNI Calico bằng Tigera Operator
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS/40-pod-cidr.txt"
command -v kind >/dev/null 2>&1 || die "Lab cần kind (https://kind.sigs.k8s.io)"
command -v docker >/dev/null 2>&1 || die "Lab cần Docker"
prev="$(kubectl config current-context 2>/dev/null)"
kind delete cluster --name cka-cni >/dev/null 2>&1 || true
info "Tạo cluster cka-cni không có CNI (khoảng 1–2 phút)"
kind create cluster --name cka-cni --config - >/dev/null <<'EOF' || die "Không tạo được cluster cka-cni"
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  disableDefaultCNI: true
  podSubnet: 10.250.0.0/16
nodes:
- role: control-plane
  image: kindest/node:v1.37.0@sha256:a1ed56cfb0e7b93589bdf97c8cd566405a265939e3620fc4f5de89adff580ae5
- role: worker
  image: kindest/node:v1.37.0@sha256:a1ed56cfb0e7b93589bdf97c8cd566405a265939e3620fc4f5de89adff580ae5
EOF
[ -n "$prev" ] && kubectl config use-context "$prev" >/dev/null
echo "Context mới: kind-cka-cni. Context hiện tại vẫn là: ${prev:-<trống>}"
echo "✔ Đã dựng xong tình huống."
