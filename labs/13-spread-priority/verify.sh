#!/usr/bin/env bash
# Lab 13 · Anti-affinity, topology spread và PriorityClass
# File sinh tự động từ src/labs/level3.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 13 "Anti-affinity, topology spread và PriorityClass"
expect "web 2/2 sẵn sàng" "$(jp deploy web -n lab13 '{.status.readyReplicas}')" "2"
expect "web dùng required podAntiAffinity theo hostname" "$(jp deploy web -n lab13 '{.spec.template.spec.affinity.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution[0].topologyKey}')" "kubernetes.io/hostname"
expect "Hai Pod web trên hai node khác nhau" "$(jp pods -n lab13 -l app=web '{.items[*].spec.nodeName}' | tr ' ' '\n' | sort -u | wc -l | tr -d ' ')" "2"
expect "spread 4/4 sẵn sàng" "$(jp deploy spread -n lab13 '{.status.readyReplicas}')" "4"
expect "spread maxSkew 1, DoNotSchedule" "$(jp deploy spread -n lab13 '{.spec.template.spec.topologySpreadConstraints[0].maxSkew}/{.spec.template.spec.topologySpreadConstraints[0].whenUnsatisfiable}')" "1/DoNotSchedule"
counts=$(jp pods -n lab13 -l app=spread '{.items[*].spec.nodeName}' | tr ' ' '\n' | sort | uniq -c | awk '{print $1}' | sort -n | xargs)
check "Pod spread chia đều (lệch ≤ 1)" bash -c "set -- $counts; [ \$# -ge 2 ] && [ \$((\${@: -1} - \$1)) -le 1 ]"
expect "13-default-pc.txt" "$(ans 13-default-pc.txt)" "team-default"
expect "critical-app value 1000000" "$(jp pc critical-app '{.value}')" "1000000"
expect_match "critical-app không phải mặc định" "$(jp pc critical-app '{.globalDefault}')" '^(false)?$'
expect "vip có priority 1000000" "$(jp pod vip -n lab13 '{.spec.priority}')" "1000000"
end_verify
