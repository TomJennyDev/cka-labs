#!/usr/bin/env bash
# Lab 07 · Liveness, readiness và startup probe
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 07 "Liveness, readiness và startup probe"
expect "07-culprit.txt" "$(ans 07-culprit.txt)" "liveness"
sp=$(jp deploy slow-api -n lab07 '{.spec.template.spec.containers[0].startupProbe.httpGet.path}:{.spec.template.spec.containers[0].startupProbe.httpGet.port}')
expect "slow-api có startupProbe GET /healthz:8080" "$sp" "/healthz:8080"
p=$(jp deploy slow-api -n lab07 '{.spec.template.spec.containers[0].startupProbe.periodSeconds}'); f=$(jp deploy slow-api -n lab07 '{.spec.template.spec.containers[0].startupProbe.failureThreshold}')
expect_ge "startupProbe cho phép ít nhất 60 giây" "$(( ${p:-10} * ${f:-3} ))" 60
expect_match "Liveness không bị tăng initialDelaySeconds" "$(jp deploy slow-api -n lab07 '{.spec.template.spec.containers[0].livenessProbe.initialDelaySeconds}')" '^0?$'
check "Vẫn giữ livenessProbe" test -n "$(jp deploy slow-api -n lab07 '{.spec.template.spec.containers[0].livenessProbe.httpGet.path}')"
expect "readiness kiểm tra /ready:8080" "$(jp deploy slow-api -n lab07 '{.spec.template.spec.containers[0].readinessProbe.httpGet.path}:{.spec.template.spec.containers[0].readinessProbe.httpGet.port}')" "/ready:8080"
expect "slow-api 2/2 Pod sẵn sàng" "$(jp deploy slow-api -n lab07 '{.status.readyReplicas}')" "2"
rs=$(kubectl get pods -n lab07 -l app=slow-api -o jsonpath='{range .items[*]}{.metadata.deletionTimestamp}|{.status.containerStatuses[0].restartCount}{"\n"}{end}' | awk -F'|' '$1==""{print $2}' | sort -u | xargs)
expect "Pod slow-api hiện tại không restart" "$rs" "0"
expect "cache có readinessProbe exec cat /tmp/ready" "$(jp deploy cache -n lab07 '{.spec.template.spec.containers[0].readinessProbe.exec.command[*]}')" "cat /tmp/ready"
expect "cache readiness chu kỳ 5 giây" "$(jp deploy cache -n lab07 '{.spec.template.spec.containers[0].readinessProbe.periodSeconds}')" "5"
expect "cache sẵn sàng" "$(jp deploy cache -n lab07 '{.status.readyReplicas}')" "1"
end_verify
