#!/usr/bin/env bash
# Lab 13 · Anti-affinity, topology spread và PriorityClass
# File sinh tự động từ src/labs/level3.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata: {name: web, namespace: lab13}
spec:
  replicas: 2
  selector: {matchLabels: {app: web}}
  template:
    metadata: {labels: {app: web}}
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - topologyKey: kubernetes.io/hostname
            labelSelector: {matchLabels: {app: web}}
      containers:
      - {name: nginx, image: nginx:1.27}
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: spread, namespace: lab13}
spec:
  replicas: 4
  selector: {matchLabels: {app: spread}}
  template:
    metadata: {labels: {app: spread}}
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        nodeTaintsPolicy: Honor
        labelSelector: {matchLabels: {app: spread}}
      containers:
      - {name: nginx, image: nginx:1.27}
EOF
echo team-default > "$ANS/13-default-pc.txt"
kubectl create priorityclass critical-app --value=1000000 --description=payment
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata: {name: vip, namespace: lab13}
spec:
  priorityClassName: critical-app
  containers:
  - {name: vip, image: nginx:1.27}
EOF
kubectl rollout status deploy/web -n lab13 --timeout=120s
kubectl rollout status deploy/spread -n lab13 --timeout=120s
