#!/usr/bin/env bash
# Lab 15 · Service, EndpointSlice và kết nối giữa các Pod
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl expose deploy web -n lab15 --port=80
kubectl get svc web -n lab15 -o jsonpath='{.spec.clusterIP}' > "$ANS/15-web-ip.txt"
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Service
metadata: {name: web-np, namespace: lab15}
spec:
  type: NodePort
  selector: {app: web}
  ports: [{port: 80, targetPort: 80, nodePort: 30080}]
---
apiVersion: v1
kind: Service
metadata: {name: legacy-db, namespace: lab15}
spec:
  ports: [{port: 5432, protocol: TCP}]
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: legacy-db-1
  namespace: lab15
  labels: {kubernetes.io/service-name: legacy-db}
addressType: IPv4
ports: [{port: 5432, protocol: TCP}]
endpoints: [{addresses: ["10.0.5.20"]}]
EOF
kubectl patch svc api-svc -n lab15 --type=json -p '[{"op":"replace","path":"/spec/selector","value":{"app":"api"}},{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'
kubectl create svc clusterip db -n lab15 --clusterip=None --tcp=5432
kubectl rollout status sts/db -n lab15 --timeout=120s
sleep 3
