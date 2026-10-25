#!/usr/bin/env bash
# Lab 43 · Service LoadBalancer với MetalLB
# File sinh tự động từ src/labs/level4-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 43 "Service LoadBalancer với MetalLB"
pool="$(jp cm lab-state -n lab43 '{.data.pool}')"; last="$(jp cm lab-state -n lab43 '{.data.last}')"
base="${last%.*}"
expect "web-lb kiểu LoadBalancer cổng 80" "$(jp svc web-lb -n lab43 '{.spec.type}:{.spec.ports[0].port}')" "LoadBalancer:80"
expect "web-lb chọn Pod app=web" "$(jp svc web-lb -n lab43 '{.spec.selector.app}')" "web"
expect "MetalLB controller sẵn sàng" "$(jp deploy controller -n metallb-system '{.status.conditions[?(@.type=="Available")].status}')" "True"
expect "IPAddressPool lab-pool có dải trong lab-state" "$(jp ipaddresspool lab-pool -n metallb-system '{.spec.addresses[*]}')" "$pool"
expect "L2Advertisement lab-l2 quảng bá lab-pool" "$(jp l2advertisement lab-l2 -n metallb-system '{.spec.ipAddressPools[*]}')" "lab-pool"
lbip="$(jp svc web-lb -n lab43 '{.status.loadBalancer.ingress[0].ip}')"
n="${lbip##*.}"
check "web-lb có EXTERNAL-IP trong dải ($lbip)" bash -c "[ '${lbip%.*}' = '$base' ] && [ '${n:-0}' -ge 200 ] 2>/dev/null && [ '${n:-0}' -le 210 ]"
expect "web-lb externalTrafficPolicy Local" "$(jp svc web-lb -n lab43 '{.spec.externalTrafficPolicy}')" "Local"
np="$(jp svc web-lb -n lab43 '{.spec.ports[0].nodePort}')"
expect "43-nodeport.txt" "$(ans 43-nodeport.txt)" "${np:-<web-lb chưa có>}"
expect "web-fixed nhận đúng IP $last" "$(jp svc web-fixed -n lab43 '{.status.loadBalancer.ingress[0].ip}')" "$last"
check "Gọi được http://$last từ trong cluster" can_reach lab43 "http://$last"
end_verify
