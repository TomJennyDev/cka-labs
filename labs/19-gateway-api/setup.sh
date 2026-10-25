#!/usr/bin/env bash
# Lab 19 · Gateway API, HTTPRoute và ReferenceGrant
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
if ! kubectl get crd httproutes.gateway.networking.k8s.io >/dev/null 2>&1; then
  info "Cài CRD Gateway API v1.6.3"
  kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.6.3/standard-install.yaml >/dev/null || die "Không tải được CRD Gateway API (cần internet)"
  kubectl wait --for=condition=Established crd/gateways.gateway.networking.k8s.io crd/httproutes.gateway.networking.k8s.io --timeout=60s >/dev/null
fi
kubectl delete ns lab19-infra lab19-app --ignore-not-found --wait=true >/dev/null 2>&1
kubectl create ns lab19-infra >/dev/null; kubectl create ns lab19-app >/dev/null
kubectl apply -f - >/dev/null <<'EOF'
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata: {name: lab-gc}
spec:
  controllerName: lab.example.com/gateway-controller
EOF
for a in web:80 api:8080 api-v2:8080 admin:80; do
  kubectl create deploy "${a%%:*}" -n lab19-app --image=nginx:1.27 >/dev/null
  kubectl expose deploy "${a%%:*}" -n lab19-app --port="${a##*:}" --target-port=80 >/dev/null
done
echo "✔ Đã dựng xong tình huống."
