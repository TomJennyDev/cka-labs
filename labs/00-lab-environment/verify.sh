#!/usr/bin/env bash
# Lab 00 · Dựng cluster lab và làm quen công cụ
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 00 "Dựng cluster lab và làm quen công cụ"
ready=$(kubectl get nodes --no-headers 2>/dev/null | awk '$2=="Ready"' | wc -l)
expect_ge "Có ít nhất 3 node Ready" "$ready" 3
check "Có control plane và 2 worker" test -n "$NODE2"
expect "00-cp.txt đúng tên control plane" "$(tr -d '[:space:]' < "$ANS/00-cp.txt" 2>/dev/null)" "$CP"
expect "00-kubelet.txt đúng phiên bản kubelet của NODE1" "$(tr -d '[:space:]' < "$ANS/00-kubelet.txt" 2>/dev/null)" "$(jp node "$NODE1" '{.status.nodeInfo.kubeletVersion}')"
end_verify
