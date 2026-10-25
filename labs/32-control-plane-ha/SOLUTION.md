# Lời giải · Lab 32 · Thêm control plane cho cluster HA

```bash
# cp-1
sudo kubeadm init phase upload-certs --upload-certs        # in ra certificate key
kubeadm token create --print-join-command
# cp-2 và cp-3:
sudo kubeadm join k8s-api:6443 --token <t> --discovery-token-ca-cert-hash sha256:<h> \
  --control-plane --certificate-key <key> --apiserver-advertise-address <ip của node>
kubectl get nodes          # 3 control-plane
kubectl -n kube-system exec etcd-cp-1 -- etcdctl … member list | wc -l > ~/cka-answers/32-etcd-members.txt
kubectl get lease kube-scheduler -n kube-system -o jsonpath='{.spec.holderIdentity}' | cut -d_ -f1 > ~/cka-answers/32-leader.txt
```
