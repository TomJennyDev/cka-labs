#!/usr/bin/env bash
# Lab 35 · Troubleshooting control plane: scheduler và controller-manager
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 35 "Troubleshooting control plane: scheduler và controller-manager"
expect "kube-controller-manager Running" "$(jp pod "kube-controller-manager-$CP" -n kube-system '{.status.phase}')" "Running"
expect "kube-scheduler Running" "$(jp pod "kube-scheduler-$CP" -n kube-system '{.status.phase}')" "Running"
expect "probe 2/2 sẵn sàng" "$(jp deploy probe -n lab35 '{.status.readyReplicas}')" "2"
check "Manifest scheduler dùng scheduler.conf" node_exec "$CP" 'grep -q "kubeconfig=/etc/kubernetes/scheduler.conf" /etc/kubernetes/manifests/kube-scheduler.yaml'
expect "35-components.txt" "$(sort "$ANS/35-components.txt" 2>/dev/null | xargs)" "kube-controller-manager kube-scheduler"
end_verify
