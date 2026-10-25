#!/usr/bin/env bash
# Lab 15 · Service, EndpointSlice và kết nối giữa các Pod
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 15 "Service, EndpointSlice và kết nối giữa các Pod"
expect "Service web cổng 80" "$(jp svc web -n lab15 '{.spec.ports[0].port}')" "80"
expect "15-web-ip.txt là ClusterIP của web" "$(ans 15-web-ip.txt)" "$(jp svc web -n lab15 '{.spec.clusterIP}')"
check "Gọi được http://web.lab15" can_reach lab15 http://web.lab15
expect "web-np là NodePort 30080" "$(jp svc web-np -n lab15 '{.spec.type}:{.spec.ports[0].nodePort}')" "NodePort:30080"
expect "api-svc có 2 endpoint" "$(jp endpointslices -n lab15 -l kubernetes.io/service-name=api-svc '{.items[*].endpoints[*].addresses[0]}' | wc -w | tr -d ' ')" "2"
check "Gọi được http://api-svc.lab15" can_reach lab15 http://api-svc.lab15
expect "Deployment api không bị sửa (vẫn 2 replica nginx:1.27)" "$(jp deploy api -n lab15 '{.spec.replicas}:{.spec.template.spec.containers[0].image}')" "2:nginx:1.27"
expect "db là headless" "$(jp svc db -n lab15 '{.spec.clusterIP}')" "None"
check "db-0.db.lab15.svc.cluster.local phân giải được" bash -c "kubectl run dns-\$RANDOM -n lab15 --image=busybox:1.36 --rm -i --restart=Never --command -- nslookup db-0.db.lab15.svc.cluster.local 2>/dev/null | grep -q 'Address.*10\.'"
check "legacy-db không có selector" test -z "$(jp svc legacy-db -n lab15 '{.spec.selector}')"
expect "EndpointSlice legacy-db-1 trỏ 10.0.5.20:5432" "$(jp endpointslice legacy-db-1 -n lab15 '{.endpoints[0].addresses[0]}:{.ports[0].port}')" "10.0.5.20:5432"
expect "legacy-db-1 gắn với Service legacy-db" "$(jp endpointslice legacy-db-1 -n lab15 '{.metadata.labels.kubernetes\.io/service-name}')" "legacy-db"
end_verify
