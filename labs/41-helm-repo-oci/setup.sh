#!/usr/bin/env bash
# Lab 41 · Helm với repo và OCI - Argo CD, sửa release lỗi
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
command -v helm >/dev/null 2>&1 || die "Chưa có helm. Cài theo https://helm.sh/docs/intro/install/"
answers_dir; rm -f "$ANS/41-argocd.yaml"
helm uninstall podinfo shop -n lab41 >/dev/null 2>&1 || true
ns_fresh lab41
info "Cài release shop rồi nâng cấp hỏng có chủ đích"
helm install shop podinfo --repo https://stefanprodan.github.io/podinfo --version 6.15.0 -n lab41 \
  --set replicaCount=2 >/dev/null || die "Không cài được release shop (cần internet tới stefanprodan.github.io)"
helm upgrade shop podinfo --repo https://stefanprodan.github.io/podinfo --version 6.15.0 -n lab41 \
  --reuse-values --set service.type=Bogus >/dev/null 2>&1 || true
[ "$(helm status shop -n lab41 2>/dev/null | awk '/^STATUS:/{print $2}')" = failed ] || info "Lưu ý: release shop chưa ở trạng thái failed"
echo "✔ Đã dựng xong tình huống."
