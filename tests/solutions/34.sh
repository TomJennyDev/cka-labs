#!/usr/bin/env bash
# Lab 34 · Troubleshooting mạng: Service, NetworkPolicy và DNS
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
orig=$(kubectl get cm lab-state -n lab34 -o jsonpath='{.data.coredns}')
kubectl -n kube-system scale deploy coredns --replicas="$orig"
kubectl patch svc web -n lab34 --type=json -p '[{"op":"replace","path":"/spec/selector","value":{"app":"web"}},{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'
kubectl patch netpol allow-frontend -n lab34 --type=json -p '[{"op":"replace","path":"/spec/ingress/0/from/0/podSelector/matchLabels","value":{"role":"frontend"}}]'
kubectl -n kube-system rollout status deploy coredns --timeout=120s
echo 4 > "$ANS/34-faults.txt"
sleep 5
