#!/usr/bin/env bash
# Lab 01 · Cài cluster bằng kubeadm trên máy ảo
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 01 "Cài cluster bằng kubeadm trên máy ảo"
ready=$(kubectl get nodes --no-headers 2>/dev/null | awk '$2=="Ready"' | wc -l)
expect_ge "3 node Ready" "$ready" 3
for c in kube-apiserver etcd kube-scheduler kube-controller-manager; do
  expect "static pod $c Running trên $CP" "$(jp pod "$c-$CP" -n kube-system '{.status.phase}')" "Running"
done
expect_match "Phiên bản kubelet là v1.34 hoặc mới hơn" "$(jp node "$CP" '{.status.nodeInfo.kubeletVersion}')" '^v1\.3[4-9]'
expect "podCIDR của cluster là 10.244.0.0/16" "$(node_exec "$CP" "grep -o 'cluster-cidr=[^ ]*' /etc/kubernetes/manifests/kube-controller-manager.yaml | cut -d= -f2")" "10.244.0.0/16"
expect "API endpoint là k8s-api:6443" "$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')" "https://k8s-api:6443"
check "CoreDNS sẵn sàng" kubectl -n kube-system rollout status deploy/coredns --timeout=5s
end_verify
