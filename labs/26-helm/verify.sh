#!/usr/bin/env bash
# Lab 26 · Helm từ chart đến rollback
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 26 "Helm từ chart đến rollback"
check "Có helm trên máy" command -v helm
check "Chart ~/cka-answers/lab26/webapp tồn tại" test -f "$ANS/lab26/webapp/Chart.yaml"
expect "Release web đang deployed" "$(helm status web -n lab26 2>/dev/null | awk '/^STATUS:/{print $2}')" "deployed"
rev=$(helm history web -n lab26 --max 20 2>/dev/null | awk 'NR>1' | wc -l | tr -d ' ')
expect_ge "web có ít nhất 4 revision (install, 2 upgrade, rollback)" "$rev" 4
check "Revision cuối là rollback" bash -c "helm history web -n lab26 | tail -1 | grep -qi 'rollback to 2'"
expect "Service web-webapp là NodePort" "$(jp svc web-webapp -n lab26 '{.spec.type}')" "NodePort"
expect "Deployment web-webapp: 2 replica, nginx:1.27" "$(jp deploy web-webapp -n lab26 '{.spec.replicas}:{.spec.template.spec.containers[0].image}')" "2:nginx:1.27"
expect "web-webapp 2/2 sẵn sàng" "$(jp deploy web-webapp -n lab26 '{.status.readyReplicas}')" "2"
check "26-rendered.yaml có Deployment preview-webapp 3 replica" bash -c "grep -q 'name: preview-webapp' '$ANS/26-rendered.yaml' && grep -q 'replicas: 3' '$ANS/26-rendered.yaml'"
check_not "preview không được cài vào cluster" helm status preview -n lab26
check_not "Release tmp đã gỡ" helm status tmp -n lab26
end_verify
