#!/usr/bin/env bash
# Lab 10 · Requests, limits, LimitRange và ResourceQuota
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
echo requests.cpu > "$ANS/10-quota.txt"
kubectl set resources deploy heavy -n lab10 --requests=cpu=200m,memory=128Mi --limits=memory=256Mi
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: LimitRange
metadata: {name: defaults, namespace: lab10}
spec:
  limits:
  - type: Container
    defaultRequest: {cpu: 100m, memory: 64Mi}
    default: {cpu: 200m, memory: 128Mi}
EOF
kubectl rollout status deploy heavy -n lab10 --timeout=180s
kubectl run plain -n lab10 --image=nginx:1.27
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata: {name: gold, namespace: lab10}
spec:
  containers:
  - name: gold
    image: nginx:1.27
    resources:
      requests: {cpu: 100m, memory: 64Mi}
      limits: {cpu: 100m, memory: 64Mi}
EOF
kubectl wait --for=condition=Ready pod/plain pod/gold -n lab10 --timeout=120s
