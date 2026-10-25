#!/usr/bin/env bash
# Lab 15 · Service, EndpointSlice và kết nối giữa các Pod
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS/15-web-ip.txt"
ns_fresh lab15
kubectl create deploy web -n lab15 --image=nginx:1.27 --replicas=2 >/dev/null
kubectl create deploy api -n lab15 --image=nginx:1.27 --replicas=2 >/dev/null
kubectl create svc clusterip api-svc -n lab15 --tcp=80:8080 >/dev/null
kubectl patch svc api-svc -n lab15 -p '{"spec":{"selector":{"app":"apis"}}}' >/dev/null
kubectl apply -n lab15 -f - >/dev/null <<'EOF'
apiVersion: apps/v1
kind: StatefulSet
metadata: {name: db}
spec:
  serviceName: db
  replicas: 2
  selector: {matchLabels: {app: db}}
  template:
    metadata: {labels: {app: db}}
    spec:
      containers:
      - {name: db, image: busybox:1.36, command: ["sleep", "3600"], ports: [{containerPort: 5432}]}
EOF
kubectl rollout status deploy/web deploy/api -n lab15 --timeout=120s >/dev/null 2>&1 || kubectl rollout status deploy/api -n lab15 --timeout=120s >/dev/null
echo "✔ Đã dựng xong tình huống."
