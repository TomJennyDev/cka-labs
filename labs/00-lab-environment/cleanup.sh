#!/usr/bin/env bash
# Lab 00 · Dựng cluster lab và làm quen công cụ
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
rm -f "$ANS/00-cp.txt" "$ANS/00-kubelet.txt"
