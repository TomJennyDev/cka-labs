#!/usr/bin/env bash
# Lab 32 · Thêm control plane cho cluster HA
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 32 "Thêm control plane cho cluster HA"
cps=$(kubectl get nodes -l node-role.kubernetes.io/control-plane --no-headers | awk '$2=="Ready"' | wc -l | tr -d ' ')
expect "3 control plane Ready" "$cps" "3"
for n in $(kubectl get nodes -l node-role.kubernetes.io/control-plane -o name | cut -d/ -f2); do
  expect "kube-apiserver Running trên $n" "$(jp pod "kube-apiserver-$n" -n kube-system '{.status.phase}')" "Running"
done
expect "32-etcd-members.txt" "$(ans 32-etcd-members.txt)" "3"
expect "32-leader.txt" "$(ans 32-leader.txt)" "$(jp lease kube-scheduler -n kube-system '{.spec.holderIdentity}' | cut -d_ -f1)"
end_verify
