# Lời giải · Lab 30 · Nâng cấp cluster kubeadm 1.34 → 1.35

```bash
# cp-1
sudo sed -i 's#/v1.34/#/v1.35/#' /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update && apt-cache madison kubeadm | head -3
sudo apt-mark unhold kubeadm && sudo apt-get install -y kubeadm='1.35.*' && sudo apt-mark hold kubeadm
sudo kubeadm upgrade plan
sudo kubeadm upgrade plan | grep -o 'kubeadm upgrade apply v[0-9.]*' | head -1 | awk '{print $4}' > ~/cka-answers/30-target.txt
sudo kubeadm upgrade apply $(cat ~/cka-answers/30-target.txt)
kubectl drain cp-1 --ignore-daemonsets
sudo apt-mark unhold kubelet kubectl && sudo apt-get install -y kubelet='1.35.*' kubectl='1.35.*' && sudo apt-mark hold kubelet kubectl
sudo systemctl daemon-reload && sudo systemctl restart kubelet
kubectl uncordon cp-1

# từng worker (ví dụ worker-1)
kubectl drain worker-1 --ignore-daemonsets --delete-emptydir-data
ssh worker-1
  sudo sed -i 's#/v1.34/#/v1.35/#' /etc/apt/sources.list.d/kubernetes.list && sudo apt-get update
  sudo apt-mark unhold kubeadm kubelet kubectl
  sudo apt-get install -y kubeadm='1.35.*' && sudo kubeadm upgrade node
  sudo apt-get install -y kubelet='1.35.*' kubectl='1.35.*' && sudo apt-mark hold kubeadm kubelet kubectl
  sudo systemctl daemon-reload && sudo systemctl restart kubelet
  exit
kubectl uncordon worker-1
kubectl get nodes
```
