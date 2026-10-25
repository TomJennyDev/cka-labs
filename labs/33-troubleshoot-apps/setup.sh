#!/usr/bin/env bash
# Lab 33 · Troubleshooting ứng dụng: sáu Deployment hỏng
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS/33-oom.txt"
ns_fresh lab33
kubectl apply -n lab33 -f - >/dev/null <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata: {name: img}
spec:
  selector: {matchLabels: {app: img}}
  template:
    metadata: {labels: {app: img}}
    spec:
      containers: [{name: nginx, image: "nginx:1.27-alpne"}]
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: cmd}
spec:
  selector: {matchLabels: {app: cmd}}
  template:
    metadata: {labels: {app: cmd}}
    spec:
      containers: [{name: app, image: busybox:1.36, command: ["slep", "3600"]}]
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: oom}
spec:
  selector: {matchLabels: {app: oom}}
  template:
    metadata: {labels: {app: oom}}
    spec:
      containers:
      - name: app
        image: busybox:1.36
        command: ["sh", "-c", "x=$(head -c 100m /dev/zero | tr '\\000' a); echo loaded ${#x} bytes; sleep 3600"]
        resources: {limits: {memory: 48Mi}}
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: pending}
spec:
  replicas: 2
  selector: {matchLabels: {app: pending}}
  template:
    metadata: {labels: {app: pending}}
    spec:
      nodeSelector: {disktype: nvme}
      containers: [{name: nginx, image: nginx:1.27}]
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: cfg}
spec:
  selector: {matchLabels: {app: cfg}}
  template:
    metadata: {labels: {app: cfg}}
    spec:
      containers:
      - name: app
        image: busybox:1.36
        command: ["sh", "-c", "echo MODE=$MODE; sleep 3600"]
        envFrom: [{configMapRef: {name: app-settings}}]
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: notready}
spec:
  selector: {matchLabels: {app: notready}}
  template:
    metadata: {labels: {app: notready}}
    spec:
      containers:
      - name: nginx
        image: nginx:1.27
        readinessProbe:
          httpGet: {path: /healthz, port: 80}
          periodSeconds: 5
EOF
sleep 20
echo "✔ Đã dựng xong tình huống."
