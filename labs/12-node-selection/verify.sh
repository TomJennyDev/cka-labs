#!/usr/bin/env bash
# Lab 12 · nodeSelector, node affinity, taint và toleration
# File sinh tự động từ src/labs/level3.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 12 "nodeSelector, node affinity, taint và toleration"
expect "$NODE1 có disktype=ssd" "$(jp node "$NODE1" '{.metadata.labels.disktype}')" "ssd"
expect "$NODE2 có disktype=hdd" "$(jp node "$NODE2" '{.metadata.labels.disktype}')" "hdd"
expect "Pod fast dùng nodeSelector disktype=ssd" "$(jp pod fast -n lab12 '{.spec.nodeSelector.disktype}')" "ssd"
expect "Pod fast chạy trên $NODE1" "$(jp pod fast -n lab12 '{.spec.nodeName}')" "$NODE1"
expect "$NODE2 có taint dedicated=gpu:NoSchedule" "$(jp node "$NODE2" '{.spec.taints[?(@.key=="dedicated")].value}:{.spec.taints[?(@.key=="dedicated")].effect}')" "gpu:NoSchedule"
expect "$NODE2 có label accelerator=nvidia" "$(jp node "$NODE2" '{.metadata.labels.accelerator}')" "nvidia"
expect "gpu-job 2/2 sẵn sàng" "$(jp deploy gpu-job -n lab12 '{.status.readyReplicas}')" "2"
expect "gpu-job chỉ chạy trên $NODE2" "$(jp pods -n lab12 -l app=gpu-job '{.items[*].spec.nodeName}' | tr ' ' '\n' | sort -u | xargs)" "$NODE2"
check "gpu-job dùng required node affinity" test -n "$(jp deploy gpu-job -n lab12 '{.spec.template.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution}')"
expect "flex ưu tiên disktype=hdd với weight 80" "$(jp pod flex -n lab12 '{.spec.affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].weight}')" "80"
end_verify
