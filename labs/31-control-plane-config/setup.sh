#!/usr/bin/env bash
# Lab 31 · Chứng chỉ, cấu hình control plane và kubelet
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env kind
detect_nodes
answers_dir; rm -f "$ANS"/31-*
command -v openssl >/dev/null || die "Cần openssl trên máy chạy lab"
node_exec "$CP" 'cp -n /etc/kubernetes/manifests/kube-apiserver.yaml /root/lab31-kube-apiserver.yaml.orig; sha256sum /etc/kubernetes/pki/apiserver.crt | cut -d" " -f1 > /root/lab31-crt.sha'
echo "✔ Đã dựng xong tình huống."
