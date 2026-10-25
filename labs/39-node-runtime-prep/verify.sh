#!/usr/bin/env bash
# Lab 39 · Chuẩn bị node - container runtime, kernel và CRI
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 39 "Chuẩn bị node - container runtime, kernel và CRI"
on1() { node_exec "$NODE1" "$1" 2>/dev/null; }
check "Gói cri-dockerd đã cài" on1 'dpkg -s cri-dockerd 2>/dev/null | grep -q "^Status: install ok installed"'
expect "cri-docker.service tự chạy khi khởi động" "$(on1 'systemctl is-enabled cri-docker.service')" "enabled"
expect "cri-docker.service đang chạy" "$(on1 'systemctl is-active cri-docker.service')" "active"
expect "modules-load: overlay và br_netfilter" "$(on1 'grep -Ex "[[:space:]]*(overlay|br_netfilter)[[:space:]]*" /etc/modules-load.d/k8s.conf | tr -d " " | sort | tr "\n" " "')" "br_netfilter overlay "
for k in net.bridge.bridge-nf-call-iptables net.ipv6.conf.all.forwarding net.ipv4.ip_forward; do
  kre="$(echo "$k" | sed 's/\./\\./g')"
  expect "sysctl.d/k8s.conf có $k = 1" "$(on1 "grep -Ec '^[[:space:]]*$kre[[:space:]]*=[[:space:]]*1[[:space:]]*\$' /etc/sysctl.d/k8s.conf")" "1"
done
expect "Đã áp dụng ngay: net.ipv6.conf.all.forwarding" "$(on1 'sysctl -n net.ipv6.conf.all.forwarding')" "1"
expect "Đã áp dụng ngay: net.ipv4.ip_forward" "$(on1 'sysctl -n net.ipv4.ip_forward')" "1"
check "crictl ps chạy được trên NODE1" on1 'crictl ps >/dev/null 2>&1'
ep="$(on1 "awk '/^containerRuntimeEndpoint:/{print \$2}' /var/lib/kubelet/config.yaml")"
[ -n "$ep" ] || ep="$(on1 "grep -o 'container-runtime-endpoint=[^\" ]*' /var/lib/kubelet/kubeadm-flags.env | cut -d= -f2")"
expect "39-endpoint.txt" "$(ans 39-endpoint.txt)" "${ep:-<không đọc được từ node>}"
cni="$(on1 'ls /etc/cni/net.d | head -1')"
expect "39-cni.txt" "$(ans 39-cni.txt)" "${cni:-<không đọc được từ node>}"
prov="$(jp sc '{.items[?(@.metadata.annotations.storageclass\.kubernetes\.io/is-default-class=="true")].provisioner}')"
expect "39-provisioner.txt" "$(ans 39-provisioner.txt)" "${prov:-<không có StorageClass mặc định>}"
end_verify
