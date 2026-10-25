#!/usr/bin/env bash
# Lab 18 · Ingress, IngressClass và TLS
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 18 "Ingress, IngressClass và TLS"
expect "shop-tls là Secret TLS" "$(jp secret shop-tls -n lab18 '{.type}')" "kubernetes.io/tls"
check "shop-tls có chứng chỉ cho shop.lab.local" bash -c "kubectl get secret shop-tls -n lab18 -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -subject | grep -q shop.lab.local"
expect "shop dùng class lab-ingress" "$(jp ingress shop -n lab18 '{.spec.ingressClassName}')" "lab-ingress"
expect "shop host shop.lab.local" "$(jp ingress shop -n lab18 '{.spec.rules[0].host}')" "shop.lab.local"
expect "shop /api (Prefix) → api:8080" "$(jp ingress shop -n lab18 '{.spec.rules[0].http.paths[?(@.path=="/api")].pathType}:{.spec.rules[0].http.paths[?(@.path=="/api")].backend.service.name}:{.spec.rules[0].http.paths[?(@.path=="/api")].backend.service.port.number}')" "Prefix:api:8080"
expect "shop / (Prefix) → web:80" "$(jp ingress shop -n lab18 '{.spec.rules[0].http.paths[?(@.path=="/")].pathType}:{.spec.rules[0].http.paths[?(@.path=="/")].backend.service.name}:{.spec.rules[0].http.paths[?(@.path=="/")].backend.service.port.number}')" "Prefix:web:80"
expect "shop TLS dùng shop-tls cho shop.lab.local" "$(jp ingress shop -n lab18 '{.spec.tls[0].secretName}:{.spec.tls[0].hosts[0]}')" "shop-tls:shop.lab.local"
expect_match "docs không ghi ingressClassName" "$(jp ingress docs -n lab18 '{.spec.ingressClassName}')" '^(lab-ingress)?$'
expect "docs /guide kiểu Exact → web:80" "$(jp ingress docs -n lab18 '{.spec.rules[0].host}:{.spec.rules[0].http.paths[0].path}:{.spec.rules[0].http.paths[0].pathType}:{.spec.rules[0].http.paths[0].backend.service.name}')" "docs.lab.local:/guide:Exact:web"
expect "lab-ingress là IngressClass mặc định" "$(jp ingressclass lab-ingress '{.metadata.annotations.ingressclass\.kubernetes\.io/is-default-class}')" "true"
end_verify
