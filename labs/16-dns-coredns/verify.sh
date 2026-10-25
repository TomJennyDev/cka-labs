#!/usr/bin/env bash
# Lab 16 · DNS trong cluster và CoreDNS
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 16 "DNS trong cluster và CoreDNS"
expect "16-dns-ip.txt" "$(ans 16-dns-ip.txt)" "$(jp svc kube-dns -n kube-system '{.spec.clusterIP}')"
expect "16-domain.txt" "$(ans 16-domain.txt)" "cluster.local"
expect_match "client dùng DNS của cluster" "$(jp pod client -n lab16 '{.spec.dnsPolicy}')" '^ClusterFirst$'
expect "client vẫn dùng busybox:1.36" "$(jp pod client -n lab16 '{.spec.containers[0].image}')" "busybox:1.36"
check "Từ client phân giải được web.lab16" bash -c "kubectl exec client -n lab16 -- nslookup web.lab16 | grep -q 'Address.*10\.'"
expect "custom-dns dnsPolicy None" "$(jp pod custom-dns -n lab16 '{.spec.dnsPolicy}')" "None"
expect "custom-dns nameserver 1.1.1.1" "$(jp pod custom-dns -n lab16 '{.spec.dnsConfig.nameservers[*]}')" "1.1.1.1"
expect "custom-dns search lab16.svc.cluster.local" "$(jp pod custom-dns -n lab16 '{.spec.dnsConfig.searches[*]}')" "lab16.svc.cluster.local"
expect "custom-dns ndots 2" "$(jp pod custom-dns -n lab16 '{.spec.dnsConfig.options[?(@.name=="ndots")].value}')" "2"
check "Pod phân giải legacy.corp.internal → 10.10.10.10" bash -c "kubectl run dns-\$RANDOM -n lab16 --image=busybox:1.36 --rm -i --restart=Never --command -- nslookup legacy.corp.internal 2>/dev/null | grep -q '10.10.10.10'"
check "DNS của cluster vẫn chạy (kubernetes.default)" bash -c "kubectl run dns-\$RANDOM -n lab16 --image=busybox:1.36 --rm -i --restart=Never --command -- nslookup kubernetes.default.svc.cluster.local 2>/dev/null | grep -q 'Address.*10\.'"
end_verify
