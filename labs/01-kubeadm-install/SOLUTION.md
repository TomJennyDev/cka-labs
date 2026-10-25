# Lời giải · Lab 01 · Cài cluster bằng kubeadm trên máy ảo

```bash
# trên cp-1
sudo kubeadm init --control-plane-endpoint k8s-api:6443 \
  --pod-network-cidr 10.244.0.0/16 --apiserver-advertise-address 192.168.56.10 --upload-certs
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

curl -LO https://raw.githubusercontent.com/projectcalico/calico/v3.32.2/manifests/calico.yaml
sed -i 's|# - name: CALICO_IPV4POOL_CIDR|- name: CALICO_IPV4POOL_CIDR|; s|#   value: "192.168.0.0/16"|  value: "10.244.0.0/16"|' calico.yaml
kubectl apply -f calico.yaml

kubeadm token create --print-join-command
# chạy lệnh in ra trên worker-1 và worker-2 với sudo:
ssh worker-1 sudo kubeadm join k8s-api:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
ssh worker-2 sudo kubeadm join k8s-api:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
kubectl get nodes -w
```
Nếu node đứng `NotReady`: `kubectl -n kube-system get pods -l k8s-app=calico-node` và `journalctl -u kubelet` trên node đó.
