#!/usr/bin/env bash
# Lab 09 · DaemonSet, Job và CronJob
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
ns_fresh lab09
echo "✔ Đã dựng xong tình huống."
