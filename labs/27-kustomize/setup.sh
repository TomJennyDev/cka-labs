#!/usr/bin/env bash
# Lab 27 · Kustomize với base và overlay
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -rf "$ANS/lab27" "$ANS/27-rendered.yaml"
ns_fresh lab27
mkdir -p "$ANS/lab27/base"
cat > "$ANS/lab27/base/deployment.yaml" <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata: {name: web}
spec:
  replicas: 1
  selector: {matchLabels: {app: web}}
  template:
    metadata: {labels: {app: web}}
    spec:
      containers:
      - name: web
        image: nginx:1.27
        envFrom:
        - configMapRef: {name: app-config}
EOF
cat > "$ANS/lab27/base/service.yaml" <<'EOF'
apiVersion: v1
kind: Service
metadata: {name: web}
spec:
  selector: {app: web}
  ports: [{port: 80}]
EOF
cat > "$ANS/lab27/base/kustomization.yaml" <<'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources: [deployment.yaml, service.yaml]
configMapGenerator:
- name: app-config
  literals: [MODE=dev, LOG_LEVEL=info]
EOF
echo "Base: $ANS/lab27/base"
echo "✔ Đã dựng xong tình huống."
