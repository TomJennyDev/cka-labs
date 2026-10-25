#!/usr/bin/env bash
# Lab 08 · Init container và sidecar container
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
ns_fresh lab08
kubectl apply -n lab08 -f - >/dev/null <<'EOF'
apiVersion: v1
kind: Pod
metadata: {name: legacy}
spec:
  containers:
  - name: app
    image: busybox:1.36
    command: ["sh", "-c", "while true; do echo \"$(date) heartbeat order-service\" >> /var/log/app/app.log; sleep 3; done"]
    volumeMounts:
    - {name: logs, mountPath: /var/log/app}
  volumes:
  - name: logs
    emptyDir: {}
EOF
echo "✔ Đã dựng xong tình huống."
