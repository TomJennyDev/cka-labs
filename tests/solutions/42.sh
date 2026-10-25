#!/usr/bin/env bash
# Lab 42 · Cài và dùng một Operator thật - cert-manager
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.21.3/cert-manager.yaml >/dev/null
kubectl -n cert-manager wait --for=condition=Available deploy --all --timeout=300s
kubectl get crd -o name | grep 'cert-manager\.io$' | cut -d/ -f2 | sort > "$ANS/42-crds.txt"
kubectl explain certificate.spec.subject > "$ANS/42-subject.txt"
for i in $(seq 1 20); do
  kubectl apply -f - >/dev/null 2>&1 <<'EOF' && break
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata: {name: selfsigned}
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata: {name: web-cert, namespace: lab42}
spec:
  secretName: web-tls
  dnsNames: [web.lab42.svc]
  issuerRef: {name: selfsigned, kind: ClusterIssuer}
EOF
  sleep 5
done
kubectl wait --for=condition=Ready certificate/web-cert -n lab42 --timeout=120s
