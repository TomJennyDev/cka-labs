#!/usr/bin/env bash
# Lab 41 · Helm với repo và OCI - Argo CD, sửa release lỗi
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 41 "Helm với repo và OCI - Argo CD, sửa release lỗi"
f="$ANS/41-argocd.yaml"
check "41-argocd.yaml tồn tại" test -s "$f"
expect "Không có CRD trong file" "$(grep -c '^kind: CustomResourceDefinition' "$f" 2>/dev/null || true)" "0"
check "Có Deployment argocd-server" bash -c "grep -q '^  name: argocd-server$' '$f'"
check "Chart argo-cd 10.11.1" bash -c "grep -q 'helm.sh/chart: argo-cd-10.11.1' '$f'"
check "Namespace argocd" bash -c "grep -q 'namespace: argocd' '$f'"
check_not "Không cài release argocd vào cluster" bash -c "helm status argocd -n argocd >/dev/null 2>&1"
expect "Release podinfo deployed" "$(helm status podinfo -n lab41 2>/dev/null | awk '/^STATUS:/{print $2}')" "deployed"
check "podinfo dùng chart podinfo-6.15.0" bash -c "helm list -n lab41 2>/dev/null | grep -E '^podinfo[[:space:]]' | grep -q 'podinfo-6.15.0'"
expect "Deployment podinfo 2/2" "$(jp deploy podinfo -n lab41 '{.status.readyReplicas}')" "2"
expect "ui.message = CKA" "$(jp deploy podinfo -n lab41 '{.spec.template.spec.containers[0].env[?(@.name=="PODINFO_UI_MESSAGE")].value}')" "CKA"
expect "Release shop deployed" "$(helm status shop -n lab41 2>/dev/null | awk '/^STATUS:/{print $2}')" "deployed"
expect "Service shop-podinfo là ClusterIP" "$(jp svc shop-podinfo -n lab41 '{.spec.type}')" "ClusterIP"
expect "shop vẫn 2 replica" "$(jp deploy shop-podinfo -n lab41 '{.spec.replicas}')" "2"
end_verify
