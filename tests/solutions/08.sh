#!/usr/bin/env bash
# Lab 08 · Init container và sidecar container
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata: {name: web, namespace: lab08}
spec:
  initContainers:
  - name: wait-db
    image: busybox:1.36
    command: ["sh", "-c", "until nslookup db.lab08.svc.cluster.local; do echo waiting; sleep 2; done"]
  containers:
  - {name: web, image: nginx:1.27}
EOF
sleep 5
kubectl create svc clusterip db -n lab08 --tcp=5432
kubectl wait --for=condition=Ready pod/web -n lab08 --timeout=120s
kubectl get pod legacy -n lab08 -o yaml > /tmp/legacy.yaml
python3 - <<'PY'
import yaml
d = yaml.safe_load(open("/tmp/legacy.yaml"))
d["spec"]["initContainers"] = [{"name": "log-tail", "image": "busybox:1.36", "restartPolicy": "Always",
    "command": ["sh", "-c", "tail -n+1 -F /var/log/app/app.log"], "volumeMounts": [{"name": "logs", "mountPath": "/var/log/app"}]}]
d.pop("status", None)
yaml.safe_dump(d, open("/tmp/legacy.yaml", "w"))
PY
kubectl replace --force -f /tmp/legacy.yaml
kubectl wait --for=condition=Ready pod/legacy -n lab08 --timeout=120s
sleep 8
