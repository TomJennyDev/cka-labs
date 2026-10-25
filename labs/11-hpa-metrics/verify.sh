#!/usr/bin/env bash
# Lab 11 · metrics-server và HorizontalPodAutoscaler
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 11 "metrics-server và HorizontalPodAutoscaler"
top=$(kubectl top pod -n kube-system --sort-by=memory --no-headers 2>/dev/null | awk 'NR<=2{print $1}')
check "11-top-pod.txt là Pod dùng nhiều memory nhất" bash -c "grep -qx '$(ans 11-top-pod.txt)' <<<'$top'"
expect "HPA web min/max 2/6" "$(jp hpa web -n lab11 '{.spec.minReplicas}/{.spec.maxReplicas}')" "2/6"
expect "HPA web mục tiêu CPU 50%" "$(jp hpa web -n lab11 '{.spec.metrics[0].resource.target.averageUtilization}')" "50"
expect "HPA web scale down chờ 60 giây" "$(jp hpa web -n lab11 '{.spec.behavior.scaleDown.stabilizationWindowSeconds}')" "60"
expect "api có CPU request 100m" "$(jp deploy api -n lab11 '{.spec.template.spec.containers[0].resources.requests.cpu}')" "100m"
expect_match "HPA api đọc được metric CPU" "$(jp hpa api -n lab11 '{.status.currentMetrics[0].resource.current.averageUtilization}')" '^[0-9]+$'
end_verify
