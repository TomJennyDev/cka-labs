#!/usr/bin/env bash
# Lab 14 · Static pod, lập lịch thủ công và bảo trì node
# File sinh tự động từ src/labs/level3.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 14 "Static pod, lập lịch thủ công và bảo trì node"
expect "Mirror pod static-web-$NODE1 Running" "$(jp pod "static-web-$NODE1" '{.status.phase}')" "Running"
check "static-web là static pod (mirror)" test -n "$(jp pod "static-web-$NODE1" '{.metadata.annotations.kubernetes\.io/config\.mirror}')"
expect "manual chạy trên $NODE2" "$(jp pod manual -n lab14 '{.spec.nodeName}')" "$NODE2"
expect "manual Running" "$(jp pod manual -n lab14 '{.status.phase}')" "Running"
check "manual không qua scheduler (không có event Scheduled)" bash -c "! kubectl get events -n lab14 --field-selector involvedObject.name=manual,reason=Scheduled -o name | grep -q ."
expect "web-pdb minAvailable 2" "$(jp pdb web-pdb -n lab14 '{.spec.minAvailable}')" "2"
expect "web-pdb chọn app=web" "$(jp pdb web-pdb -n lab14 '{.spec.selector.matchLabels.app}')" "web"
expect "$NODE1 đã cordon" "$(jp node "$NODE1" '{.spec.unschedulable}')" "true"
expect "Không còn Pod web trên $NODE1" "$(jp pods -n lab14 -l app=web '{.items[*].spec.nodeName}' | tr ' ' '\n' | grep -c "^$NODE1$")" "0"
expect "web vẫn 3/3 sẵn sàng" "$(jp deploy web -n lab14 '{.status.readyReplicas}')" "3"
end_verify
