#!/usr/bin/env bash
# Lab 27 · Kustomize với base và overlay
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
mkdir -p "$ANS/lab27/overlays/prod"
cat > "$ANS/lab27/overlays/prod/kustomization.yaml" <<'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources: [../../base]
namespace: lab27
namePrefix: prod-
labels:
- pairs: {env: prod}
  includeSelectors: true
replicas:
- {name: web, count: 3}
images:
- {name: nginx, newTag: "1.28"}
configMapGenerator:
- name: app-config
  behavior: merge
  literals: [MODE=prod]
patches:
- path: resources.yaml
EOF
cat > "$ANS/lab27/overlays/prod/resources.yaml" <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata: {name: web}
spec:
  template:
    spec:
      containers:
      - name: web
        resources:
          requests: {cpu: 100m}
EOF
kubectl kustomize "$ANS/lab27/overlays/prod" > "$ANS/27-rendered.yaml"
kubectl apply -k "$ANS/lab27/overlays/prod"
kubectl rollout status deploy/prod-web -n lab27 --timeout=180s
