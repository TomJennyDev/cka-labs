#!/usr/bin/env bash
# Lab 32 · Thêm control plane cho cluster HA
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env vm
detect_nodes
answers_dir; rm -f "$ANS"/32-*
echo "✔ Đã dựng xong tình huống."
