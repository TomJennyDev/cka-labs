#!/usr/bin/env bash
# Lab 14 · Static pod, lập lịch thủ công và bảo trì node
# File sinh tự động từ src/labs/level3.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
dir=$(static_dir "$NODE1")
kubectl run static-web --image=nginx:1.27 --dry-run=client -o yaml > /tmp/static-web.yaml
node_put "$NODE1" /tmp/static-web.yaml "$dir/static-web.yaml"
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata: {name: manual, namespace: lab14}
spec:
  nodeName: $NODE2
  containers:
  - {name: manual, image: nginx:1.27}
EOF
kubectl create pdb web-pdb -n lab14 --selector=app=web --min-available=2
kubectl drain "$NODE1" --ignore-daemonsets --delete-emptydir-data --timeout=180s
kubectl rollout status deploy/web -n lab14 --timeout=120s
for i in $(seq 1 30); do [ "$(kubectl get pod "static-web-$NODE1" -o jsonpath='{.status.phase}' 2>/dev/null)" = Running ] && break; sleep 3; done
