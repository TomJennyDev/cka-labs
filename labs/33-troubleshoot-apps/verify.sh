#!/usr/bin/env bash
# Lab 33 · Troubleshooting ứng dụng: sáu Deployment hỏng
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 33 "Troubleshooting ứng dụng: sáu Deployment hỏng"
for d in img cmd oom pending cfg notready; do
  want=$(jp deploy $d -n lab33 '{.spec.replicas}')
  expect "$d sẵn sàng ${want:-?}/${want:-?}" "$(jp deploy $d -n lab33 '{.status.readyReplicas}')" "${want:-x}"
done
expect "img dùng nginx:1.27" "$(jp deploy img -n lab33 '{.spec.template.spec.containers[0].image}')" "nginx:1.27"
expect "cmd chạy sleep 3600" "$(jp deploy cmd -n lab33 '{.spec.template.spec.containers[0].command[*]} {.spec.template.spec.containers[0].args[*]}' | xargs)" "sleep 3600"
check "oom giữ nguyên lệnh" bash -c "kubectl get deploy oom -n lab33 -o jsonpath='{.spec.template.spec.containers[0].command[2]}' | grep -q 'head -c 100m /dev/zero'"
expect "oom memory limit 256Mi" "$(jp deploy oom -n lab33 '{.spec.template.spec.containers[0].resources.limits.memory}')" "256Mi"
expect "pending vẫn 2 replica" "$(jp deploy pending -n lab33 '{.spec.replicas}')" "2"
expect "ConfigMap app-settings có MODE=prod" "$(jp cm app-settings -n lab33 '{.data.MODE}')" "prod"
check "cfg đọc MODE=prod" bash -c "kubectl logs -n lab33 deploy/cfg | grep -q MODE=prod"
expect "notready vẫn có readinessProbe, path /" "$(jp deploy notready -n lab33 '{.spec.template.spec.containers[0].readinessProbe.httpGet.path}')" "/"
expect "33-oom.txt" "$(ans 33-oom.txt)" "OOMKilled"
end_verify
