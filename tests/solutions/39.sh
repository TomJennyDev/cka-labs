#!/usr/bin/env bash
# Lab 39 · Chuẩn bị node - container runtime, kernel và CRI
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
node_exec "$NODE1" "$(cat <<'NODE'
set -e
dpkg -i /root/pkgs/cri-dockerd_*.deb >/dev/null
systemctl daemon-reload
systemctl enable --now cri-docker.service
printf 'overlay\nbr_netfilter\n' > /etc/modules-load.d/k8s.conf
printf 'net.bridge.bridge-nf-call-iptables = 1\nnet.ipv6.conf.all.forwarding = 1\nnet.ipv4.ip_forward = 1\n' > /etc/sysctl.d/k8s.conf
sysctl --system >/dev/null 2>&1 || true
printf 'runtime-endpoint: unix:///run/containerd/containerd.sock\nimage-endpoint: unix:///run/containerd/containerd.sock\n' > /etc/crictl.yaml
NODE
)"
ep="$(node_exec "$NODE1" "awk '/^containerRuntimeEndpoint:/{print \$2}' /var/lib/kubelet/config.yaml")"
[ -n "$ep" ] || ep="$(node_exec "$NODE1" "grep -o 'container-runtime-endpoint=[^\" ]*' /var/lib/kubelet/kubeadm-flags.env | cut -d= -f2")"
echo "$ep" > "$ANS/39-endpoint.txt"
node_exec "$NODE1" 'ls /etc/cni/net.d | head -1' > "$ANS/39-cni.txt"
kubectl get sc -o jsonpath='{.items[?(@.metadata.annotations.storageclass\.kubernetes\.io/is-default-class=="true")].provisioner}' > "$ANS/39-provisioner.txt"
