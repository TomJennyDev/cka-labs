#!/usr/bin/env bash
# Lab 06 · ConfigMap và Secret
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl create cm app-config -n lab06 --from-literal=APP_MODE=production --from-literal=APP_PORT=8080
kubectl create cm app-files -n lab06 --from-file=app.properties="$ANS/06-app.properties"
kubectl create secret generic db-cred -n lab06 --from-literal=username=admin --from-literal=password=S3cr3t-pass
kubectl get secret legacy-token -n lab06 -o jsonpath='{.data.token}' | base64 -d > "$ANS/06-token.txt"
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata: {name: app, namespace: lab06}
spec:
  selector: {matchLabels: {app: app}}
  template:
    metadata: {labels: {app: app}}
    spec:
      containers:
      - name: busybox
        image: busybox:1.36
        command: ["sleep", "3600"]
        envFrom:
        - configMapRef: {name: app-config}
        env:
        - name: DB_PASSWORD
          valueFrom: {secretKeyRef: {name: db-cred, key: password}}
        volumeMounts:
        - {name: files, mountPath: /etc/app, readOnly: true}
      volumes:
      - name: files
        configMap: {name: app-files}
EOF
kubectl rollout status deploy/app -n lab06 --timeout=120s
