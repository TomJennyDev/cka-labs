#!/usr/bin/env bash
# Lab 43 · Service LoadBalancer với MetalLB
# File sinh tự động từ src/labs/level4-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab43 --ignore-not-found --wait=false >/dev/null
kubectl delete ns metallb-system --ignore-not-found --wait=false >/dev/null 2>&1 || true
kubectl get crd -o name 2>/dev/null | grep 'metallb.io' | xargs -r kubectl delete --wait=false >/dev/null 2>&1 || true
kubectl get clusterrole,clusterrolebinding -o name 2>/dev/null | grep 'metallb-system:' | xargs -r kubectl delete >/dev/null 2>&1 || true
kubectl delete validatingwebhookconfiguration metallb-webhook-configuration --ignore-not-found >/dev/null 2>&1 || true
rm -f "$ANS/43-nodeport.txt"
