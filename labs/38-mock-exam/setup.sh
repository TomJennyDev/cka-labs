#!/usr/bin/env bash
# Lab 38 · Đề thi thử CKA (2 giờ, 16 câu)
# File sinh tự động từ src/labs/level9.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env kind
detect_nodes
answers_dir; rm -f "$ANS/38-nodes.txt"
exam_hosts || info "Không cài được kubectl lên node, vẫn làm được từ máy của bạn"
kubectl delete ns mock-x mock-a mock-b mock-c --ignore-not-found --wait=true >/dev/null 2>&1
kubectl delete pc exam-high --ignore-not-found >/dev/null
node_exec "$NODE1" "rm -f $(static_dir "$NODE1")/exam-static.yaml" >/dev/null 2>&1 || true
for n in mock-a mock-b mock-c; do kubectl create ns $n >/dev/null; done
kubectl label node "$NODE2" exam-role=gpu --overwrite >/dev/null
kubectl taint node "$NODE2" exam=true:NoSchedule --overwrite >/dev/null
kubectl create deploy db -n mock-b --image=nginx:1.27 >/dev/null
kubectl expose deploy db -n mock-b --port=80 >/dev/null
kubectl apply -n mock-c -f - >/dev/null <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata: {name: broken-api}
spec:
  replicas: 2
  selector: {matchLabels: {app: broken-api}}
  template:
    metadata: {labels: {app: broken-api}}
    spec:
      containers:
      - name: nginx
        image: nginx:1.27-slimx
        readinessProbe:
          httpGet: {path: /, port: 8080}
          periodSeconds: 5
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: backend}
spec:
  replicas: 2
  selector: {matchLabels: {app: backend}}
  template:
    metadata: {labels: {app: backend}}
    spec:
      containers: [{name: nginx, image: nginx:1.27}]
---
apiVersion: v1
kind: Service
metadata: {name: backend}
spec:
  selector: {app: backend-svc}
  ports: [{port: 80, targetPort: 80}]
EOF
echo "Bắt đầu lúc $(date '+%H:%M'). Hết giờ lúc $(date -d '+120 min' '+%H:%M' 2>/dev/null || date -v+120M '+%H:%M')."
echo "✔ Đã dựng xong tình huống."
