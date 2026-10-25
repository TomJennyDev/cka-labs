#!/usr/bin/env bash
# Lab 25 · securityContext và Pod Security Admission
# File sinh tự động từ src/labs/level6.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl label ns lab25 pod-security.kubernetes.io/enforce=restricted pod-security.kubernetes.io/warn=restricted --overwrite
kubectl patch deploy api -n lab25 --type=strategic -p '{"spec":{"template":{"spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":1000,"seccompProfile":{"type":"RuntimeDefault"}},"containers":[{"name":"busybox","securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}}}]}}}}'
kubectl rollout status deploy/api -n lab25 --timeout=180s
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata: {name: secure, namespace: lab25}
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    seccompProfile: {type: RuntimeDefault}
  containers:
  - name: c
    image: busybox:1.36
    command: ["sleep", "3600"]
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities: {drop: ["ALL"]}
    volumeMounts: [{name: tmp, mountPath: /tmp}]
  volumes:
  - {name: tmp, emptyDir: {}}
EOF
kubectl wait --for=condition=Ready pod/secure -n lab25 --timeout=120s
sleep 3
