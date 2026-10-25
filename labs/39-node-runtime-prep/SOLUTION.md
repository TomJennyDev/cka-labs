# Lời giải · Lab 39 · Chuẩn bị node - container runtime, kernel và CRI

```bash
./lab ssh $NODE1
dpkg -i /root/pkgs/cri-dockerd_*.deb
systemctl daemon-reload
systemctl enable --now cri-docker.service
systemctl is-enabled cri-docker.service; systemctl is-active cri-docker.service

cat > /etc/modules-load.d/k8s.conf <<'EOF'
overlay
br_netfilter
EOF
modprobe overlay; modprobe br_netfilter      # trên node kind có thể báo lỗi vì dùng kernel của máy host: bỏ qua

cat > /etc/sysctl.d/k8s.conf <<'EOF'
net.bridge.bridge-nf-call-iptables = 1
net.ipv6.conf.all.forwarding = 1
net.ipv4.ip_forward = 1
EOF
sysctl --system

cat /etc/crictl.yaml                        # đang trỏ tới socket không tồn tại
cat > /etc/crictl.yaml <<'EOF'
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
EOF
crictl ps

grep -i endpoint /var/lib/kubelet/config.yaml /var/lib/kubelet/kubeadm-flags.env
ls /etc/cni/net.d/
exit
```
```bash
echo unix:///run/containerd/containerd.sock > ~/cka-answers/39-endpoint.txt
./lab ssh $NODE1   # ls /etc/cni/net.d  → ví dụ 10-kindnet.conflist
echo 10-kindnet.conflist > ~/cka-answers/39-cni.txt
kubectl get sc       # cột PROVISIONER của dòng (default)
kubectl get sc -o jsonpath='{.items[?(@.metadata.annotations.storageclass\.kubernetes\.io/is-default-class=="true")].provisioner}' > ~/cka-answers/39-provisioner.txt
kubectl get csidriver   # kind không có CSI driver nào: local-path không phải CSI
```
