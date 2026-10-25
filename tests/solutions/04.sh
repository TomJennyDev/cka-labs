#!/usr/bin/env bash
# Lab 04 · Sinh YAML nhanh và trích xuất bằng jsonpath
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl create deploy api --image=nginx:1.27 --replicas=2 --dry-run=client -o yaml > "$ANS/04-api.yaml"
sed -i '0,/      labels:/{s/      labels:/      labels:\n        tier: backend/}' "$ANS/04-api.yaml"
kubectl apply -n lab04 -f "$ANS/04-api.yaml"
kubectl rollout status deploy/api -n lab04 --timeout=90s
kubectl get pods -n lab04 -o jsonpath='{range .items[*]}{.metadata.name} {.status.podIP}{"\n"}{end}' > "$ANS/04-pod-ips.txt"
kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}' > "$ANS/04-node-ips.txt"
kubectl get pods -n lab04 --sort-by=.metadata.name -o custom-columns=POD:.metadata.name,IMAGE:.spec.containers[*].image > "$ANS/04-images.txt"
