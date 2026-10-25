#!/usr/bin/env bash
# Lab 38 · Đề thi thử CKA (2 giờ, 16 câu)
# File sinh tự động từ src/labs/level9.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns mock-x mock-a mock-b mock-c --ignore-not-found --wait=false >/dev/null
kubectl delete pc exam-high --ignore-not-found >/dev/null
for pv in $(kubectl get pv -o jsonpath='{range .items[?(@.spec.claimRef.namespace=="mock-a")]}{.metadata.name}{" "}{end}' 2>/dev/null); do kubectl delete pv "$pv" --wait=false >/dev/null 2>&1; done
node_exec "$NODE1" "rm -f $(static_dir "$NODE1")/exam-static.yaml" >/dev/null 2>&1 || true
kubectl label node "$NODE2" exam-role- >/dev/null 2>&1 || true
kubectl taint node "$NODE2" exam- >/dev/null 2>&1 || true
rm -f "$ANS/38-nodes.txt"
