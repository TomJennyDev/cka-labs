#!/usr/bin/env bash
# Lab 12 · nodeSelector, node affinity, taint và toleration
# File sinh tự động từ src/labs/level3.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl label node "$NODE1" disktype=ssd
kubectl label node "$NODE2" disktype=hdd accelerator=nvidia
kubectl taint node "$NODE2" dedicated=gpu:NoSchedule
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata: {name: fast, namespace: lab12}
spec:
  nodeSelector: {disktype: ssd}
  containers:
  - {name: fast, image: nginx:1.27}
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: gpu-job, namespace: lab12}
spec:
  replicas: 2
  selector: {matchLabels: {app: gpu-job}}
  template:
    metadata: {labels: {app: gpu-job}}
    spec:
      tolerations:
      - {key: dedicated, operator: Equal, value: gpu, effect: NoSchedule}
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - {key: accelerator, operator: In, values: [nvidia]}
      containers:
      - {name: job, image: busybox:1.36, command: ["sleep", "3600"]}
---
apiVersion: v1
kind: Pod
metadata: {name: flex, namespace: lab12}
spec:
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 80
        preference:
          matchExpressions:
          - {key: disktype, operator: In, values: [hdd]}
  containers:
  - {name: flex, image: nginx:1.27}
EOF
kubectl rollout status deploy/gpu-job -n lab12 --timeout=120s
kubectl wait --for=condition=Ready pod/fast -n lab12 --timeout=90s
