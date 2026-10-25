#!/usr/bin/env bash
# Lab 31 · Chứng chỉ, cấu hình control plane và kubelet
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
node_exec "$CP" 'if [ -f /root/lab31-kube-apiserver.yaml.orig ]; then cp /root/lab31-kube-apiserver.yaml.orig /etc/kubernetes/manifests/kube-apiserver.yaml; rm -f /root/lab31-kube-apiserver.yaml.orig /root/lab31-crt.sha; fi' >/dev/null 2>&1 || true
rm -f "$ANS"/31-*
