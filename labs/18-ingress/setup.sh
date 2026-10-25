#!/usr/bin/env bash
# Lab 18 · Ingress, IngressClass và TLS
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
ns_fresh lab18
kubectl apply -f - >/dev/null <<'EOF'
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata: {name: lab-ingress}
spec:
  controller: lab.example.com/ingress-controller
EOF
kubectl annotate ingressclass lab-ingress ingressclass.kubernetes.io/is-default-class- >/dev/null 2>&1 || true
kubectl create deploy web -n lab18 --image=nginx:1.27 >/dev/null
kubectl expose deploy web -n lab18 --port=80 >/dev/null
kubectl create deploy api -n lab18 --image=nginx:1.27 >/dev/null
kubectl expose deploy api -n lab18 --port=8080 --target-port=80 >/dev/null
echo "✔ Đã dựng xong tình huống."
