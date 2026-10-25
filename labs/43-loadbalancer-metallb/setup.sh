#!/usr/bin/env bash
# Lab 43 · Service LoadBalancer với MetalLB
# File sinh tự động từ src/labs/level4-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS/43-nodeport.txt"
if kubectl get ns metallb-system >/dev/null 2>&1; then
  info "Gỡ MetalLB đang có để bạn tự cài"
  kubectl delete ns metallb-system --wait=true >/dev/null 2>&1 || true
fi
kubectl get crd -o name 2>/dev/null | grep 'metallb.io' | xargs -r kubectl delete >/dev/null 2>&1 || true
kubectl get clusterrole,clusterrolebinding -o name 2>/dev/null | grep 'metallb-system:' | xargs -r kubectl delete >/dev/null 2>&1 || true
kubectl delete validatingwebhookconfiguration metallb-webhook-configuration --ignore-not-found >/dev/null 2>&1 || true
ns_fresh lab43
kubectl create deploy web -n lab43 --image=nginx:1.27 --replicas=2 >/dev/null
ip="$(jp node "$CP" '{.status.addresses[?(@.type=="InternalIP")].address}')"
base="${ip%.*}"
kubectl create cm lab-state -n lab43 --from-literal=pool="$base.200-$base.210" --from-literal=last="$base.210" >/dev/null
echo "Dải IP cho MetalLB: $base.200-$base.210 (IP cố định cho web-fixed: $base.210)"
echo "✔ Đã dựng xong tình huống."
