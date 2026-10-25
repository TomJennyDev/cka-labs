#!/usr/bin/env bash
# Chuẩn bị một node Ubuntu 22.04/24.04 để chạy kubeadm.
# Dùng được cho máy ảo bất kỳ:  sudo K8S_MINOR=1.34 NODE_IP=<ip> ./prepare-node.sh
set -euo pipefail
K8S_MINOR="${K8S_MINOR:-1.34}"
NODE_IP="${NODE_IP:-$(hostname -I | awk '{print $1}')}"

echo "› /etc/hosts"
grep -q cp-1 /etc/hosts || cat >> /etc/hosts <<HOSTS
192.168.56.10 cp-1 k8s-api
192.168.56.11 worker-1
192.168.56.12 worker-2
192.168.56.13 cp-2
192.168.56.14 cp-3
HOSTS

echo "› Tắt swap"
swapoff -a
sed -i '/\sswap\s/ s/^#*/#/' /etc/fstab

echo "› Kernel module và sysctl"
cat > /etc/modules-load.d/k8s.conf <<MOD
overlay
br_netfilter
MOD
modprobe overlay; modprobe br_netfilter
cat > /etc/sysctl.d/k8s.conf <<SYS
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
SYS
sysctl --system >/dev/null

echo "› containerd (systemd cgroup driver)"
apt-get update -qq
apt-get install -y -qq containerd apt-transport-https ca-certificates curl gpg jq >/dev/null
mkdir -p /etc/containerd
containerd config default > /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd

echo "› kubeadm, kubelet, kubectl v${K8S_MINOR}"
mkdir -p /etc/apt/keyrings
curl -fsSL "https://pkgs.k8s.io/core:/stable:/v${K8S_MINOR}/deb/Release.key" | gpg --dearmor --yes -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v${K8S_MINOR}/deb/ /" > /etc/apt/sources.list.d/kubernetes.list
apt-get update -qq
apt-get install -y -qq kubelet kubeadm kubectl >/dev/null
apt-mark hold kubelet kubeadm kubectl >/dev/null
echo "KUBELET_EXTRA_ARGS=--node-ip=${NODE_IP}" > /etc/default/kubelet
systemctl enable --now kubelet
cat > /etc/crictl.yaml <<CRI
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
CRI

# SSH không mật khẩu giữa các node (để ./lab ssh và verify chạy được từ cp-1)
if [ -d /vagrant ]; then
  KEY=/vagrant/.lab-ssh-key
  [ -f "$KEY" ] || ssh-keygen -q -t ed25519 -N '' -f "$KEY"
  install -d -m 700 -o vagrant -g vagrant /home/vagrant/.ssh
  install -m 600 -o vagrant -g vagrant "$KEY" /home/vagrant/.ssh/id_ed25519
  grep -q "$(cat "$KEY.pub")" /home/vagrant/.ssh/authorized_keys 2>/dev/null || cat "$KEY.pub" >> /home/vagrant/.ssh/authorized_keys
  printf 'Host cp-1 cp-2 cp-3 worker-1 worker-2 k8s-api\n  StrictHostKeyChecking accept-new\n' > /home/vagrant/.ssh/config
  chown vagrant:vagrant /home/vagrant/.ssh/config
fi
echo "✔ $(hostname) sẵn sàng: $(kubeadm version -o short)"
