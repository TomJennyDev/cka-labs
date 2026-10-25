#!/usr/bin/env bash
# Lab 26 · Helm từ chart đến rollback
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
command -v helm >/dev/null 2>&1 || die "Chưa có helm. Cài theo https://helm.sh/docs/intro/install/"
answers_dir; rm -rf "$ANS/lab26" "$ANS/26-rendered.yaml"
helm uninstall web tmp -n lab26 >/dev/null 2>&1 || true
ns_fresh lab26
echo "✔ Đã dựng xong tình huống."
