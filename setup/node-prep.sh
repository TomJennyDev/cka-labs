#!/usr/bin/env bash
# Chuẩn bị một node Ubuntu 24.04 để chạy Kubernetes bằng kubeadm.
# Đây là lời giải nhanh cho lab 01; nên tự làm tay ít nhất một lần.
#   sudo K8S_MINOR=v1.36 ./setup/node-prep.sh
set -euo pipefail

K8S_MINOR=${K8S_MINOR:-v1.36}

[[ $EUID -eq 0 ]] || { echo "Chạy bằng sudo"; exit 1; }

echo "1/5 Tắt swap"
swapoff -a
sed -i '/\sswap\s/ s/^\([^#]\)/#\1/' /etc/fstab

echo "2/5 Kernel module và sysctl"
cat > /etc/modules-load.d/k8s.conf <<EOF
overlay
br_netfilter
EOF
modprobe overlay
modprobe br_netfilter
cat > /etc/sysctl.d/k8s.conf <<EOF
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF
sysctl --system >/dev/null

echo "3/5 containerd với systemd cgroup driver"
apt-get update -qq
apt-get install -y -qq containerd apt-transport-https ca-certificates curl gpg >/dev/null
mkdir -p /etc/containerd
containerd config default > /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd
systemctl enable containerd >/dev/null

echo "4/5 kubeadm, kubelet, kubectl $K8S_MINOR"
mkdir -p /etc/apt/keyrings
curl -fsSL "https://pkgs.k8s.io/core:/stable:/$K8S_MINOR/deb/Release.key" | gpg --dearmor --yes -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/$K8S_MINOR/deb/ /" > /etc/apt/sources.list.d/kubernetes.list
apt-get update -qq
apt-get install -y -qq kubelet kubeadm kubectl >/dev/null
apt-mark hold kubelet kubeadm kubectl >/dev/null
systemctl enable kubelet >/dev/null

echo "5/5 crictl trỏ tới containerd"
cat > /etc/crictl.yaml <<EOF
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
timeout: 10
EOF

echo "Xong: $(kubeadm version -o short)"
