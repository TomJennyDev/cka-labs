#!/usr/bin/env bash
# Lab 41 · Helm với repo và OCI - Argo CD, sửa release lỗi
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
helm repo add argo https://argoproj.github.io/argo-helm >/dev/null 2>&1 || true
helm repo update argo >/dev/null
helm template argocd argo/argo-cd --version 10.11.1 -n argocd --set crds.install=false > "$ANS/41-argocd.yaml"
helm install podinfo oci://ghcr.io/stefanprodan/charts/podinfo --version 6.15.0 -n lab41 \
  --set replicaCount=2 --set ui.message=CKA --wait --timeout 5m
helm upgrade shop podinfo --repo https://stefanprodan.github.io/podinfo --version 6.15.0 -n lab41 \
  --reuse-values --set service.type=ClusterIP --wait --timeout 5m
