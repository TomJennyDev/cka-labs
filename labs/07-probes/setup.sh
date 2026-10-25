#!/usr/bin/env bash
# Lab 07 · Liveness, readiness và startup probe
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS/07-culprit.txt"
ns_fresh lab07
kubectl apply -n lab07 -f - >/dev/null <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata: {name: slow-api}
spec:
  replicas: 2
  selector: {matchLabels: {app: slow-api}}
  template:
    metadata: {labels: {app: slow-api}}
    spec:
      containers:
      - name: api
        image: busybox:1.36
        command: ["sh", "-c", "sleep 25; mkdir -p /www; echo ok > /www/healthz; echo ok > /www/ready; exec httpd -f -p 8080 -h /www"]
        ports: [{containerPort: 8080}]
        livenessProbe:
          httpGet: {path: /healthz, port: 8080}
          periodSeconds: 5
          failureThreshold: 2
        readinessProbe:
          httpGet: {path: /ready, port: 8081}
          periodSeconds: 5
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: cache}
spec:
  selector: {matchLabels: {app: cache}}
  template:
    metadata: {labels: {app: cache}}
    spec:
      containers:
      - name: cache
        image: busybox:1.36
        command: ["sh", "-c", "sleep 8; touch /tmp/ready; sleep 3600"]
EOF
echo "✔ Đã dựng xong tình huống."
