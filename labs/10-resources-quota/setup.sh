#!/usr/bin/env bash
# Lab 10 · Requests, limits, LimitRange và ResourceQuota
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS/10-quota.txt"
ns_fresh lab10
kubectl create quota team-quota -n lab10 --hard=requests.cpu=2,requests.memory=1Gi,pods=6 >/dev/null
kubectl apply -n lab10 -f - >/dev/null <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata: {name: heavy}
spec:
  replicas: 3
  selector: {matchLabels: {app: heavy}}
  template:
    metadata: {labels: {app: heavy}}
    spec:
      containers:
      - name: nginx
        image: nginx:1.27
        resources:
          requests: {cpu: 800m, memory: 128Mi}
          limits: {memory: 256Mi}
EOF
echo "✔ Đã dựng xong tình huống."
