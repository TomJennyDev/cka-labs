#!/usr/bin/env bash
# Lab 30 · Nâng cấp cluster kubeadm 1.36 → 1.37
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env vm
detect_nodes
answers_dir; rm -f "$ANS/30-target.txt"
v=$(jp node "$CP" '{.status.nodeInfo.kubeletVersion}')
case "$v" in v1.36.*) ;; v1.37.*) info "Control plane đã ở $v. Lab vẫn chấm được.";; *) die "Lab cần cluster v1.36 (đang là $v)";; esac
echo "✔ Đã dựng xong tình huống."
