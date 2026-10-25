#!/usr/bin/env bash
# Lab 43 · Service LoadBalancer với MetalLB
# File sinh tự động từ src/labs/level4-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl expose deploy web -n lab43 --name=web-lb --type=LoadBalancer --port=80
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.16.1/config/manifests/metallb-native.yaml >/dev/null
kubectl -n metallb-system wait --for=condition=Available deploy/controller --timeout=300s
kubectl -n metallb-system rollout status ds/speaker --timeout=300s
pool="$(kubectl get cm lab-state -n lab43 -o jsonpath='{.data.pool}')"; last="$(kubectl get cm lab-state -n lab43 -o jsonpath='{.data.last}')"
for i in $(seq 1 20); do
  kubectl apply -f - >/dev/null 2>&1 <<EOF && break
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata: {name: lab-pool, namespace: metallb-system}
spec:
  addresses: ["$pool"]
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata: {name: lab-l2, namespace: metallb-system}
spec:
  ipAddressPools: [lab-pool]
EOF
  sleep 5
done
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: web-fixed
  namespace: lab43
  annotations: {metallb.io/loadBalancerIPs: "$last"}
spec:
  type: LoadBalancer
  selector: {app: web}
  ports: [{port: 80, targetPort: 80}]
EOF
kubectl patch svc web-lb -n lab43 -p '{"spec":{"externalTrafficPolicy":"Local"}}'
for i in $(seq 1 30); do [ -n "$(kubectl get svc web-lb -n lab43 -o jsonpath='{.status.loadBalancer.ingress[0].ip}')" ] && break; sleep 2; done
kubectl get svc web-lb -n lab43 -o jsonpath='{.spec.ports[0].nodePort}' > "$ANS/43-nodeport.txt"
