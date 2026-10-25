#!/usr/bin/env bash
# Lab 34 · Troubleshooting mạng: Service, NetworkPolicy và DNS
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 34 "Troubleshooting mạng: Service, NetworkPolicy và DNS"
orig=$(jp cm lab-state -n lab34 '{.data.coredns}')
expect_ge "CoreDNS có Pod sẵn sàng" "$(jp deploy coredns -n kube-system '{.status.readyReplicas}')" 1
check "client gọi được http://web.lab34" kubectl exec client -n lab34 -- wget -qO- -T5 http://web.lab34
expect "default-deny còn nguyên" "$(jp netpol default-deny -n lab34 '{.spec.podSelector}:{.spec.policyTypes[*]}')" "{}:Ingress"
expect "client giữ label role=frontend" "$(jp pod client -n lab34 '{.metadata.labels.role}')" "frontend"
expect "Pod web giữ label app=web" "$(jp pods -n lab34 -l app=web '{.items[*].metadata.labels.app}' | tr ' ' '\n' | sort -u)" "web"
expect "Không có Service mới (chỉ web)" "$(jp svc -n lab34 '{.items[*].metadata.name}')" "web"
check_not "Pod khác (không phải frontend) vẫn bị chặn" can_reach lab34 http://web.lab34 role=other
expect "34-faults.txt" "$(ans 34-faults.txt)" "4"
end_verify
