#!/usr/bin/env bash
# Lab 45 · Đề thi thử 2 - chế độ phòng thi (2 giờ, 16 câu)
# File sinh tự động từ src/labs/level9-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns m2-ops m2-app m2-net m2-mon m2-store --ignore-not-found --wait=false >/dev/null 2>&1
kubectl delete pv m2-pv --ignore-not-found --wait=false >/dev/null 2>&1
kubectl delete sc m2-retain --ignore-not-found >/dev/null 2>&1
kubectl delete pc m2-high --ignore-not-found >/dev/null 2>&1
kubectl delete clusterrole,clusterrolebinding pv-viewer --ignore-not-found >/dev/null 2>&1
kubectl delete crd widgets.lab.example.com --ignore-not-found --wait=false >/dev/null 2>&1
kubectl delete gatewayclass m2-gc --ignore-not-found >/dev/null 2>&1
kubectl label node --all m2-agent- >/dev/null 2>&1
for n in "$CP" "$NODE1" "$NODE2"; do node_exec "$n" 'rm -f /root/45-*.txt' >/dev/null 2>&1; done
rm -rf "$ANS/m2-kust"
