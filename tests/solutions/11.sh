#!/usr/bin/env bash
# Lab 11 · metrics-server và HorizontalPodAutoscaler
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
for i in $(seq 1 30); do kubectl top pod -n kube-system --no-headers >/dev/null 2>&1 && break; sleep 5; done
kubectl top pod -n kube-system --sort-by=memory --no-headers | head -1 | awk '{print $1}' > "$ANS/11-top-pod.txt"
kubectl apply -f - <<'EOF'
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: {name: web, namespace: lab11}
spec:
  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: web}
  minReplicas: 2
  maxReplicas: 6
  metrics:
  - type: Resource
    resource: {name: cpu, target: {type: Utilization, averageUtilization: 50}}
  behavior:
    scaleDown: {stabilizationWindowSeconds: 60}
EOF
kubectl set resources deploy api -n lab11 --requests=cpu=100m
kubectl rollout status deploy api -n lab11 --timeout=120s
for i in $(seq 1 40); do [ -n "$(kubectl get hpa api -n lab11 -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}')" ] && break; sleep 5; done
