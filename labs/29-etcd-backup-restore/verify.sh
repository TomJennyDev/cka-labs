#!/usr/bin/env bash
# Lab 29 · Sao lưu và khôi phục etcd
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 29 "Sao lưu và khôi phục etcd"
expect "29-datadir.txt" "$(node_exec "$CP" 'tr -d "[:space:]" < /root/29-datadir.txt')" "/var/lib/etcd"
check "Snapshot /opt/etcd-backup.db hợp lệ" node_exec "$CP" 'etcdutl snapshot status /opt/etcd-backup.db'
expect "Volume etcd-data trỏ /var/lib/etcd-restore" "$(node_exec "$CP" "grep -oE 'path: /var/lib/etcd[^ ]*' /etc/kubernetes/manifests/etcd.yaml | awk '{print \$2}' | xargs")" "/var/lib/etcd-restore"
check "Namespace lab29-before còn" kubectl get ns lab29-before
check_not "Namespace lab29-after đã biến mất (cluster về thời điểm chụp)" kubectl get ns lab29-after
expect "etcd Running" "$(jp pod "etcd-$CP" -n kube-system '{.status.phase}')" "Running"
end_verify
