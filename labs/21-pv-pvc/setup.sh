#!/usr/bin/env bash
# Lab 21 · PersistentVolume, PVC và reclaim policy
# File sinh tự động từ src/labs/level5.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
kubectl delete ns lab21 lab21-old --ignore-not-found --wait=true >/dev/null 2>&1
kubectl delete pv pv-log pv-old --ignore-not-found --wait=true >/dev/null 2>&1
kubectl create ns lab21 >/dev/null; kubectl create ns lab21-old >/dev/null
kubectl apply -f - >/dev/null <<'EOF'
apiVersion: v1
kind: PersistentVolume
metadata: {name: pv-old}
spec:
  capacity: {storage: 1Gi}
  accessModes: [ReadWriteOnce]
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual-old
  hostPath: {path: /mnt/lab21/old, type: DirectoryOrCreate}
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: data, namespace: lab21-old}
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: manual-old
  resources: {requests: {storage: 1Gi}}
EOF
wait_for 60 bash -c "[ \"\$(kubectl get pvc data -n lab21-old -o jsonpath='{.status.phase}')\" = Bound ]"
kubectl delete ns lab21-old --wait=true >/dev/null
wait_for 60 bash -c "[ \"\$(kubectl get pv pv-old -o jsonpath='{.status.phase}')\" = Released ]"
kubectl create cm lab-state -n lab21 --from-literal=pv-old-uid="$(jp pv pv-old '{.metadata.uid}')" >/dev/null
echo "✔ Đã dựng xong tình huống."
