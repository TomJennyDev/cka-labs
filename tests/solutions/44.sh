#!/usr/bin/env bash
# Lab 44 · Gateway API với controller thật - HTTPS và chuyển từ Ingress
# File sinh tự động từ src/labs/level4-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl apply -f - <<'EOF'
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata: {name: shop-gw, namespace: lab44}
spec:
  gatewayClassName: nginx
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    hostname: shop.lab44.local
  - name: https
    protocol: HTTPS
    port: 443
    hostname: shop.lab44.local
    tls:
      mode: Terminate
      certificateRefs: [{kind: Secret, name: shop-tls}]
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: {name: shop, namespace: lab44}
spec:
  parentRefs: [{name: shop-gw, sectionName: https}]
  hostnames: [shop.lab44.local]
  rules:
  - matches: [{path: {type: PathPrefix, value: /api}}]
    backendRefs: [{name: api, port: 8080}]
  - matches: [{path: {type: PathPrefix, value: /}}]
    backendRefs: [{name: web, port: 80}]
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: {name: shop-redirect, namespace: lab44}
spec:
  parentRefs: [{name: shop-gw, sectionName: http}]
  hostnames: [shop.lab44.local]
  rules:
  - filters:
    - type: RequestRedirect
      requestRedirect: {scheme: https, statusCode: 301}
EOF
kubectl wait --for=condition=Programmed gateway/shop-gw -n lab44 --timeout=180s
kubectl delete ingress shop -n lab44
sleep 10
