# Lời giải · Lab 31 · Chứng chỉ, cấu hình control plane và kubelet

```bash
./lab ssh $CP
grep service-cluster-ip-range /etc/kubernetes/manifests/kube-apiserver.yaml   # 10.96.0.0/12
kubeadm certs check-expiration
kubeadm certs renew apiserver
cp /etc/kubernetes/manifests/kube-apiserver.yaml /root/kube-apiserver.yaml.bak
vi /etc/kubernetes/manifests/kube-apiserver.yaml
#   - --enable-admission-plugins=NodeRestriction,AlwaysPullImages
# sửa manifest cũng làm kubelet tạo lại Pod, nên chứng chỉ mới được nạp
exit
echo 10.96.0.0/12 > ~/cka-answers/31-svc-range.txt

./lab ssh $NODE1
grep -E 'cgroupDriver|clusterDNS' -A1 /var/lib/kubelet/config.yaml
exit
echo "systemd 10.96.0.10" > ~/cka-answers/31-kubelet.txt
```
