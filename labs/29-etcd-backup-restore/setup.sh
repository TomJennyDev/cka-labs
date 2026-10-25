#!/usr/bin/env bash
# Lab 29 · Sao lưu và khôi phục etcd
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env kind
detect_nodes
kubectl delete ns lab29-after lab29-before --ignore-not-found --wait=true >/dev/null 2>&1
node_exec "$CP" 'command -v etcdctl >/dev/null && command -v etcdutl >/dev/null' || {
  info "Cài etcdctl/etcdutl vào $CP"
  node_exec "$CP" 'set -e; A=$(uname -m); case $A in x86_64) A=amd64;; aarch64|arm64) A=arm64;; esac
    V=v3.6.16; cd /tmp; curl -fsSL -o etcd.tgz https://github.com/etcd-io/etcd/releases/download/$V/etcd-$V-linux-$A.tar.gz
    tar xzf etcd.tgz; cp etcd-$V-linux-$A/etcdctl etcd-$V-linux-$A/etcdutl /usr/local/bin/; rm -rf etcd.tgz etcd-$V-linux-$A' || die "Không cài được etcdctl"
}
node_exec "$CP" 'rm -f /opt/etcd-backup.db /root/29-datadir.txt'
kubectl create ns lab29-before >/dev/null
echo "✔ Đã dựng xong tình huống."
