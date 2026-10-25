#!/usr/bin/env bash
# Lab 10 · Requests, limits, LimitRange và ResourceQuota
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 10 "Requests, limits, LimitRange và ResourceQuota"
expect "10-quota.txt" "$(ans 10-quota.txt)" "requests.cpu"
expect "heavy 3/3 sẵn sàng" "$(jp deploy heavy -n lab10 '{.status.readyReplicas}')" "3"
expect "heavy requests cpu 200m" "$(jp deploy heavy -n lab10 '{.spec.template.spec.containers[0].resources.requests.cpu}')" "200m"
expect "heavy limits memory 256Mi" "$(jp deploy heavy -n lab10 '{.spec.template.spec.containers[0].resources.limits.memory}')" "256Mi"
lr='{.spec.limits[0].defaultRequest.cpu}/{.spec.limits[0].defaultRequest.memory}/{.spec.limits[0].default.cpu}/{.spec.limits[0].default.memory}'
expect "LimitRange defaults đúng giá trị" "$(jp limitrange defaults -n lab10 "$lr")" "100m/64Mi/200m/128Mi"
expect "plain Running" "$(jp pod plain -n lab10 '{.status.phase}')" "Running"
expect "plain nhận request cpu 100m từ LimitRange" "$(jp pod plain -n lab10 '{.spec.containers[0].resources.requests.cpu}')" "100m"
expect "gold là Guaranteed" "$(jp pod gold -n lab10 '{.status.qosClass}')" "Guaranteed"
expect "gold cpu 100m" "$(jp pod gold -n lab10 '{.spec.containers[0].resources.limits.cpu}')" "100m"
end_verify
