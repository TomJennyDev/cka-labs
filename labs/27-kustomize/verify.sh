#!/usr/bin/env bash
# Lab 27 · Kustomize với base và overlay
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 27 "Kustomize với base và overlay"
check "Overlay prod tồn tại" test -f "$ANS/lab27/overlays/prod/kustomization.yaml"
check "27-rendered.yaml chứa prod-web" grep -q 'name: prod-web' "$ANS/27-rendered.yaml"
expect "prod-web: 3 replica, nginx:1.28" "$(jp deploy prod-web -n lab27 '{.spec.replicas}:{.spec.template.spec.containers[0].image}')" "3:nginx:1.28"
expect "prod-web 3/3 sẵn sàng" "$(jp deploy prod-web -n lab27 '{.status.readyReplicas}')" "3"
expect "Label env=prod có cả trên selector" "$(jp deploy prod-web -n lab27 '{.metadata.labels.env}:{.spec.selector.matchLabels.env}')" "prod:prod"
expect "Container web request cpu 100m" "$(jp deploy prod-web -n lab27 '{.spec.template.spec.containers[0].resources.requests.cpu}')" "100m"
cm=$(jp deploy prod-web -n lab27 '{.spec.template.spec.containers[0].envFrom[0].configMapRef.name}')
expect_match "Deployment dùng ConfigMap prod-app-config-<hash>" "$cm" '^prod-app-config-[a-z0-9]+$'
expect "ConfigMap có MODE=prod và giữ LOG_LEVEL" "$(jp cm "$cm" -n lab27 '{.data.MODE}:{.data.LOG_LEVEL}')" "prod:info"
expect "Service prod-web chọn env=prod" "$(jp svc prod-web -n lab27 '{.spec.selector.env}')" "prod"
expect "Base không bị sửa (vẫn MODE=dev)" "$(grep -c 'MODE=dev' "$ANS/lab27/base/kustomization.yaml")" "1"
end_verify
