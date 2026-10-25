#!/usr/bin/env bash
# Lab 36 · Troubleshooting node: worker NotReady
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 36 "Troubleshooting node: worker NotReady"
expect "$NODE2 Ready" "$(jp node "$NODE2" '{.status.conditions[?(@.type=="Ready")].status}')" "True"
expect "kubelet active" "$(node_exec "$NODE2" 'systemctl is-active kubelet')" "active"
expect "kubelet enabled" "$(node_exec "$NODE2" 'systemctl is-enabled kubelet')" "enabled"
expect "clientCAFile đúng" "$(node_exec "$NODE2" "awk '/clientCAFile:/{print \$2}' /var/lib/kubelet/config.yaml")" "/etc/kubernetes/pki/ca.crt"
expect "36-file.txt" "$(ans 36-file.txt)" "/var/lib/kubelet/config.yaml"
end_verify
