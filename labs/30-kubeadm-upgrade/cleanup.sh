#!/usr/bin/env bash
# Lab 30 · Nâng cấp cluster kubeadm 1.36 → 1.37
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
rm -f "$ANS/30-target.txt"
