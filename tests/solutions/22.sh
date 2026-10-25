#!/usr/bin/env bash
# Lab 22 · StorageClass, dynamic provisioning và StatefulSet
# File sinh tự động từ src/labs/level5.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
old=$(kubectl get cm lab-state -n lab22 -o jsonpath='{.data.old-default}')
prov=$(kubectl get cm lab-state -n lab22 -o jsonpath='{.data.provisioner}')
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast
  annotations: {storageclass.kubernetes.io/is-default-class: "true"}
provisioner: $prov
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
EOF
kubectl patch sc "$old" -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: data, namespace: lab22}
spec:
  accessModes: [ReadWriteOnce]
  resources: {requests: {storage: 1Gi}}
EOF
sleep 2
kubectl get pvc data -n lab22 -o jsonpath='{.status.phase}' > "$ANS/22-phase.txt"
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata: {name: app, namespace: lab22}
spec:
  containers:
  - {name: c, image: busybox:1.36, command: ["sleep", "3600"], volumeMounts: [{name: d, mountPath: /data}]}
  volumes:
  - {name: d, persistentVolumeClaim: {claimName: data}}
---
apiVersion: v1
kind: Service
metadata: {name: db, namespace: lab22}
spec:
  clusterIP: None
  selector: {app: db}
  ports: [{port: 5432}]
---
apiVersion: apps/v1
kind: StatefulSet
metadata: {name: db, namespace: lab22}
spec:
  serviceName: db
  replicas: 2
  selector: {matchLabels: {app: db}}
  template:
    metadata: {labels: {app: db}}
    spec:
      containers:
      - name: db
        image: busybox:1.36
        command: ["sleep", "3600"]
        volumeMounts: [{name: data, mountPath: /var/lib/db}]
  volumeClaimTemplates:
  - metadata: {name: data}
    spec:
      accessModes: [ReadWriteOnce]
      storageClassName: fast
      resources: {requests: {storage: 1Gi}}
EOF
kubectl wait --for=condition=Ready pod/app -n lab22 --timeout=180s
kubectl rollout status sts/db -n lab22 --timeout=240s
