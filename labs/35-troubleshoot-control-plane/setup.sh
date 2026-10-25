#!/usr/bin/env bash
# Lab 35 · Troubleshooting control plane: scheduler và controller-manager
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env kind
detect_nodes
answers_dir; rm -f "$ANS/35-components.txt"
ns_fresh lab35
node_exec "$CP" 'set -e; mkdir -p /root/lab35; cp -n /etc/kubernetes/manifests/kube-scheduler.yaml /etc/kubernetes/manifests/kube-controller-manager.yaml /root/lab35/
  sed -i "s#- kube-controller-manager\$#- kube-controller-manegr#" /etc/kubernetes/manifests/kube-controller-manager.yaml
  sed -i "s#--kubeconfig=/etc/kubernetes/scheduler.conf#--kubeconfig=/etc/kubernetes/scheduler.config#" /etc/kubernetes/manifests/kube-scheduler.yaml'
sleep 40
kubectl create deploy probe -n lab35 --image=nginx:1.27 --replicas=2 >/dev/null
echo "✔ Đã dựng xong tình huống."
