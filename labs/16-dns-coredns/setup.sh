#!/usr/bin/env bash
# Lab 16 · DNS trong cluster và CoreDNS
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS"/16-*
ns_fresh lab16
# keep the original Corefile once, so ./lab reset 16 can put it back
[ -s "$ANS/.16-coredns-backup.yaml" ] || kubectl get cm coredns -n kube-system -o yaml 2>/dev/null \
  | sed '/^  resourceVersion:/d; /^  uid:/d; /^  creationTimestamp:/d; /last-applied-configuration/,+1d' > "$ANS/.16-coredns-backup.yaml"
kubectl create deploy web -n lab16 --image=nginx:1.27 >/dev/null
kubectl expose deploy web -n lab16 --port=80 >/dev/null
kubectl apply -n lab16 -f - >/dev/null <<'EOF'
apiVersion: v1
kind: Pod
metadata: {name: client}
spec:
  dnsPolicy: Default
  containers:
  - {name: client, image: busybox:1.36, command: ["sleep", "3600"]}
EOF
echo "✔ Đã dựng xong tình huống."
