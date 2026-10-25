#!/usr/bin/env bash
# Lab 05 · Deployment: scale, rolling update, rollback
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 05 "Deployment: scale, rolling update, rollback"
expect "shop có 4 replica" "$(jp deploy shop -n lab05 '{.spec.replicas}')" "4"
expect "shop maxSurge = 1" "$(jp deploy shop -n lab05 '{.spec.strategy.rollingUpdate.maxSurge}')" "1"
expect "shop maxUnavailable = 0" "$(jp deploy shop -n lab05 '{.spec.strategy.rollingUpdate.maxUnavailable}')" "0"
expect "shop revisionHistoryLimit = 5" "$(jp deploy shop -n lab05 '{.spec.revisionHistoryLimit}')" "5"
expect "shop đang chạy nginx:1.28" "$(jp deploy shop -n lab05 '{.spec.template.spec.containers[0].image}')" "nginx:1.28"
expect "shop 4/4 Pod sẵn sàng" "$(jp deploy shop -n lab05 '{.status.readyReplicas}')/$(jp deploy shop -n lab05 '{.status.updatedReplicas}')" "4/4"
hist=$(kubectl rollout history deploy/shop -n lab05 2>/dev/null)
check "History có change-cause 'nang cap nginx 1.28'" grep -q 'nang cap nginx 1.28' <<<"$hist"
check "Đã thử nginx:1.99 (có ReplicaSet chạy 1.99)" bash -c "kubectl get rs -n lab05 -l app=shop -o jsonpath='{.items[*].spec.template.spec.containers[0].image}' | grep -q 'nginx:1.99'"
expect "legacy dùng Recreate" "$(jp deploy legacy -n lab05 '{.spec.strategy.type}')" "Recreate"
end_verify
