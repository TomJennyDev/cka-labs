#!/usr/bin/env bash
# Lab 30 · Nâng cấp cluster kubeadm 1.34 → 1.35
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env vm
detect_nodes
answers_dir; rm -f "$ANS/30-target.txt"
v=$(jp node "$CP" '{.status.nodeInfo.kubeletVersion}')
case "$v" in v1.34.*) ;; v1.35.*) info "Control plane đã ở $v. Lab vẫn chấm được.";; *) die "Lab cần cluster v1.34 (đang là $v)";; esac
echo "✔ Đã dựng xong tình huống."
