#!/usr/bin/env bash
# Lab 06 · ConfigMap và Secret
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 06 "ConfigMap và Secret"
expect "app-config APP_MODE" "$(jp cm app-config -n lab06 '{.data.APP_MODE}')" "production"
expect "app-config APP_PORT" "$(jp cm app-config -n lab06 '{.data.APP_PORT}')" "8080"
check "app-files có key app.properties" bash -c "kubectl get cm app-files -n lab06 -o jsonpath='{.data.app\.properties}' | grep -q cache.ttl=300"
expect "db-cred password" "$(jp secret db-cred -n lab06 '{.data.password}' | base64 -d 2>/dev/null)" "S3cr3t-pass"
expect "db-cred username" "$(jp secret db-cred -n lab06 '{.data.username}' | base64 -d 2>/dev/null)" "admin"
expect "Deployment app sẵn sàng" "$(jp deploy app -n lab06 '{.status.readyReplicas}')" "1"
envs=$(kubectl exec -n lab06 deploy/app -- env 2>/dev/null)
check "Container có APP_MODE=production" grep -qx 'APP_MODE=production' <<<"$envs"
check "Container có DB_PASSWORD đúng" grep -qx 'DB_PASSWORD=S3cr3t-pass' <<<"$envs"
check "/etc/app/app.properties đọc được trong container" bash -c "kubectl exec -n lab06 deploy/app -- cat /etc/app/app.properties | grep -q feature.search"
expect "Volume gắn chỉ đọc" "$(jp deploy app -n lab06 '{.spec.template.spec.containers[0].volumeMounts[?(@.mountPath=="/etc/app")].readOnly}')" "true"
expect "06-token.txt" "$(ans 06-token.txt)" "$(jp secret legacy-token -n lab06 '{.data.token}' | base64 -d 2>/dev/null)"
end_verify
