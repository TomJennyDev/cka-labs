#!/usr/bin/env bash
# Lab 21 · PersistentVolume, PVC và reclaim policy
# File sinh tự động từ src/labs/level5.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: PersistentVolume
metadata: {name: pv-log}
spec:
  capacity: {storage: 1Gi}
  accessModes: [ReadWriteOnce]
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath: {path: /mnt/lab21/log, type: DirectoryOrCreate}
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: log-claim, namespace: lab21}
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: manual
  resources: {requests: {storage: 500Mi}}
---
apiVersion: v1
kind: Pod
metadata: {name: logger, namespace: lab21}
spec:
  containers:
  - name: c
    image: busybox:1.36
    command: ["sh", "-c", "echo ok > /log/app.log; sleep 3600"]
    volumeMounts: [{name: log, mountPath: /log}]
  volumes:
  - name: log
    persistentVolumeClaim: {claimName: log-claim}
EOF
kubectl patch pv pv-old --type=json -p '[{"op":"remove","path":"/spec/claimRef"}]'
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: reuse, namespace: lab21}
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: manual-old
  volumeName: pv-old
  resources: {requests: {storage: 1Gi}}
EOF
kubectl wait --for=condition=Ready pod/logger -n lab21 --timeout=120s
for i in $(seq 1 30); do [ "$(kubectl get pvc reuse -n lab21 -o jsonpath='{.status.phase}')" = Bound ] && break; sleep 2; done
