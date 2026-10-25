#!/usr/bin/env bash
# Lab 11 · metrics-server và HorizontalPodAutoscaler
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS/11-top-pod.txt"
kubectl get apiservice v1beta1.metrics.k8s.io >/dev/null 2>&1 || die "Chưa có metrics-server. Chạy lại env/kind/up.sh"
ns_fresh lab11
kubectl create deploy web -n lab11 --image=nginx:1.27 >/dev/null
kubectl set resources deploy web -n lab11 --requests=cpu=100m >/dev/null
kubectl expose deploy web -n lab11 --port=80 >/dev/null
kubectl create deploy api -n lab11 --image=nginx:1.27 >/dev/null
kubectl autoscale deploy api -n lab11 --min=1 --max=3 --cpu-percent=70 >/dev/null
echo "✔ Đã dựng xong tình huống."
