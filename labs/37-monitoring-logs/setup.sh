#!/usr/bin/env bash
# Lab 37 · Theo dõi tài nguyên, event và log
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS"/37-*
kubectl get apiservice v1beta1.metrics.k8s.io >/dev/null 2>&1 || die "Chưa có metrics-server. Chạy lại env/kind/up.sh"
ns_fresh lab37
kubectl apply -n lab37 -f - >/dev/null <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata: {name: burner}
spec:
  selector: {matchLabels: {app: burner}}
  template:
    metadata: {labels: {app: burner}}
    spec:
      containers:
      - {name: burn, image: busybox:1.36, command: ["sh", "-c", "while :; do :; done"], resources: {limits: {cpu: 300m}}}
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: idle}
spec:
  replicas: 2
  selector: {matchLabels: {app: idle}}
  template:
    metadata: {labels: {app: idle}}
    spec:
      containers:
      - {name: idle, image: busybox:1.36, command: ["sleep", "3600"]}
---
apiVersion: v1
kind: Pod
metadata: {name: crashy}
spec:
  containers:
  - name: app
    image: busybox:1.36
    command: ["sh", "-c", "echo 'INFO starting order-service'; echo 'INFO connecting to db:5432'; sleep 2; echo 'FATAL db unreachable after 3 retries'; exit 3"]
---
apiVersion: v1
kind: Pod
metadata: {name: multi}
spec:
  containers:
  - {name: app, image: busybox:1.36, command: ["sh", "-c", "echo app ready; sleep 3600"]}
  - name: proxy
    image: busybox:1.36
    command: ["sh", "-c", "for i in 1 2 3 4 5 6 7; do echo \"req $i ok\"; done; for i in 1 2 3 4 5; do echo \"WARN upstream timeout after 5s (req $i)\"; done; sleep 3600"]
EOF
info "Chờ crashy restart vài lần và metrics được thu thập (khoảng 60 giây)"
sleep 60
echo "✔ Đã dựng xong tình huống."
