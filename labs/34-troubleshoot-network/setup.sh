#!/usr/bin/env bash
# Lab 34 · Troubleshooting mạng: Service, NetworkPolicy và DNS
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS/34-faults.txt"
ns_fresh lab34
orig=$(jp deploy coredns -n kube-system '{.spec.replicas}')
[ "${orig:-0}" -ge 1 ] || orig=2
kubectl create cm lab-state -n lab34 --from-literal=coredns="$orig" >/dev/null
echo "$orig" > "$ANS/.34-coredns"
kubectl create deploy web -n lab34 --image=nginx:1.27 --replicas=2 >/dev/null
kubectl create svc clusterip web -n lab34 --tcp=80:8080 >/dev/null
kubectl patch svc web -n lab34 -p '{"spec":{"selector":{"app":"wbe"}}}' >/dev/null
kubectl run client -n lab34 --image=busybox:1.36 --labels=role=frontend --command -- sleep 3600 >/dev/null
kubectl apply -n lab34 -f - >/dev/null <<'EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: default-deny}
spec:
  podSelector: {}
  policyTypes: [Ingress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: allow-frontend}
spec:
  podSelector: {matchLabels: {app: web}}
  policyTypes: [Ingress]
  ingress:
  - from: [{podSelector: {matchLabels: {role: front-end}}}]
    ports: [{protocol: TCP, port: 80}]
EOF
kubectl wait --for=condition=Ready pod/client -n lab34 --timeout=90s >/dev/null
kubectl -n kube-system scale deploy coredns --replicas=0 >/dev/null
echo "✔ Đã dựng xong tình huống."
