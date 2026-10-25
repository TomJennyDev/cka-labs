#!/usr/bin/env bash
# Lab 17 · NetworkPolicy theo mô hình mặc định chặn
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 17 "NetworkPolicy theo mô hình mặc định chặn"
expect "default-deny chọn mọi Pod, chiều Ingress" "$(jp netpol default-deny -n lab17 '{.spec.podSelector}:{.spec.policyTypes[*]}')" "{}:Ingress"
check "web → api: được phép" can_reach lab17 http://api.lab17 app=web
check_not "web → db: bị chặn" can_reach lab17 http://db.lab17 app=web
check_not "Pod lạ → api: bị chặn" can_reach lab17 http://api.lab17 app=random
check "lab17-mon → api: được phép" can_reach lab17-mon http://api.lab17 app=prometheus
check_not "lab17-other → api: bị chặn" can_reach lab17-other http://api.lab17 app=web
check "api → db: được phép (gọi bằng tên, cần DNS)" can_reach lab17 http://db.lab17 app=api
check_not "api → web: bị chặn bởi egress" can_reach lab17 http://web.lab17 app=api
check "Có policy api-egress kiểu Egress" bash -c "kubectl get netpol api-egress -n lab17 -o jsonpath='{.spec.policyTypes[*]}' | grep -q Egress"
end_verify
