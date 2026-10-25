#!/usr/bin/env bash
# Lab 03 · Pod, label, log và exec
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS"/03-*.txt
ns_fresh lab03
kubectl run noisy -n lab03 --image=busybox:1.36 --command -- sh -c 'i=0; while [ $i -lt 6 ]; do echo "INFO request $i ok"; [ $((i%2)) -eq 0 ] && echo "ERROR timeout calling payments ($i)"; i=$((i+1)); done; sleep 3600' >/dev/null
kubectl apply -n lab03 -f - >/dev/null <<'EOF'
apiVersion: v1
kind: Pod
metadata: {name: broken}
spec:
  containers:
  - {name: app, image: "nginx:1.27-does-not-exist"}
EOF
kubectl run old -n lab03 --image=busybox:1.36 --command -- sh -c 'trap "" TERM; sleep 3600' >/dev/null
kubectl wait --for=condition=Ready pod/noisy pod/old -n lab03 --timeout=90s >/dev/null
kubectl create configmap lab-state -n lab03 --from-literal=broken-uid="$(jp pod broken -n lab03 '{.metadata.uid}')" >/dev/null
echo "✔ Đã dựng xong tình huống."
