#!/usr/bin/env bash
# Lab 44 · Gateway API với controller thật - HTTPS và chuyển từ Ingress
# File sinh tự động từ src/labs/level4-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
command -v openssl >/dev/null 2>&1 || die "Cần openssl trên máy chạy lab"
if ! kubectl get crd httproutes.gateway.networking.k8s.io >/dev/null 2>&1; then
  info "Cài CRD Gateway API v1.6.3"
  kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.6.3/standard-install.yaml >/dev/null || die "Không tải được CRD Gateway API (cần internet)"
fi
if ! kubectl get deploy nginx-gateway -n nginx-gateway >/dev/null 2>&1; then
  info "Cài NGINX Gateway Fabric v2.8.0"
  kubectl apply --server-side -f https://raw.githubusercontent.com/nginx/nginx-gateway-fabric/v2.8.0/deploy/crds.yaml >/dev/null || die "Không tải được CRD của NGINX Gateway Fabric"
  kubectl apply -f https://raw.githubusercontent.com/nginx/nginx-gateway-fabric/v2.8.0/deploy/nodeport/deploy.yaml >/dev/null || die "Không cài được NGINX Gateway Fabric"
fi
kubectl -n nginx-gateway wait --for=condition=Available deploy/nginx-gateway --timeout=300s >/dev/null || die "NGINX Gateway Fabric chưa sẵn sàng"
ns_fresh lab44
kubectl apply -n lab44 -f - >/dev/null <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata: {name: web}
spec:
  selector: {matchLabels: {app: web}}
  template:
    metadata: {labels: {app: web}}
    spec:
      containers:
      - name: web
        image: busybox:1.36
        command: ["sh", "-c", "mkdir -p /www && echo web > /www/index.html && exec httpd -f -p 80 -h /www"]
        ports: [{containerPort: 80}]
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: api}
spec:
  selector: {matchLabels: {app: api}}
  template:
    metadata: {labels: {app: api}}
    spec:
      containers:
      - name: api
        image: busybox:1.36
        command: ["sh", "-c", "mkdir -p /www/api && echo api > /www/api/health && exec httpd -f -p 8080 -h /www"]
        ports: [{containerPort: 8080}]
---
apiVersion: v1
kind: Service
metadata: {name: web}
spec: {selector: {app: web}, ports: [{port: 80, targetPort: 80}]}
---
apiVersion: v1
kind: Service
metadata: {name: api}
spec: {selector: {app: api}, ports: [{port: 8080, targetPort: 8080}]}
EOF
t="$(mktemp -d)"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "$t/tls.key" -out "$t/tls.crt" \
  -subj "/CN=shop.lab44.local" -addext "subjectAltName=DNS:shop.lab44.local" >/dev/null 2>&1
kubectl create secret tls shop-tls -n lab44 --cert="$t/tls.crt" --key="$t/tls.key" >/dev/null
rm -rf "$t"
kubectl create ingress shop -n lab44 --class=nginx-legacy \
  --rule="shop.lab44.local/api*=api:8080,tls=shop-tls" --rule="shop.lab44.local/*=web:80,tls=shop-tls" >/dev/null
echo "✔ Đã dựng xong tình huống."
