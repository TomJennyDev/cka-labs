#!/usr/bin/env bash
# Lab 19 · Gateway API, HTTPRoute và ReferenceGrant
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl label ns lab19-app gateway-access=true
kubectl apply -f - <<'EOF'
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata: {name: public, namespace: lab19-infra}
spec:
  gatewayClassName: lab-gc
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Selector
        selector: {matchLabels: {gateway-access: "true"}}
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: {name: shop, namespace: lab19-app}
spec:
  parentRefs: [{name: public, namespace: lab19-infra}]
  hostnames: ["shop.lab.local"]
  rules:
  - matches: [{headers: [{name: x-canary, value: "true"}]}]
    backendRefs: [{name: api-v2, port: 8080}]
  - matches: [{path: {type: PathPrefix, value: /api}}]
    backendRefs:
    - {name: api, port: 8080, weight: 90}
    - {name: api-v2, port: 8080, weight: 10}
  - matches: [{path: {type: PathPrefix, value: /}}]
    backendRefs: [{name: web, port: 80}]
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: {name: admin, namespace: lab19-infra}
spec:
  parentRefs: [{name: public}]
  hostnames: ["admin.lab.local"]
  rules:
  - backendRefs: [{name: admin, namespace: lab19-app, port: 80}]
---
apiVersion: gateway.networking.k8s.io/v1
kind: ReferenceGrant
metadata: {name: allow-infra-routes, namespace: lab19-app}
spec:
  from: [{group: gateway.networking.k8s.io, kind: HTTPRoute, namespace: lab19-infra}]
  to: [{group: "", kind: Service}]
EOF
