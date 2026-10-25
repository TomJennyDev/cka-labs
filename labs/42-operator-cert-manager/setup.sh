#!/usr/bin/env bash
# Lab 42 · Cài và dùng một Operator thật - cert-manager
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS/42-crds.txt" "$ANS/42-subject.txt"
if kubectl get ns cert-manager >/dev/null 2>&1 || kubectl get crd certificates.cert-manager.io >/dev/null 2>&1; then
  info "Gỡ cert-manager đang có để bạn tự cài"
  kubectl delete clusterissuer --all >/dev/null 2>&1 || true
  kubectl delete ns cert-manager --wait=true >/dev/null 2>&1 || true
  kubectl delete crd,clusterrole,clusterrolebinding,mutatingwebhookconfiguration,validatingwebhookconfiguration -l app.kubernetes.io/instance=cert-manager >/dev/null 2>&1 || true
  kubectl get crd -o name 2>/dev/null | grep 'cert-manager\.io$' | xargs -r kubectl delete >/dev/null 2>&1 || true
  kubectl delete role,rolebinding -n kube-system -l app.kubernetes.io/instance=cert-manager >/dev/null 2>&1 || true
fi
ns_fresh lab42
echo "✔ Đã dựng xong tình huống."
