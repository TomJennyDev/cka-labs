# Lời giải · Lab 36 · Troubleshooting node: worker NotReady

```bash
kubectl get nodes                     # NODE2 NotReady
./lab ssh $NODE2
systemctl status kubelet              # inactive (dead), disabled
systemctl enable --now kubelet
journalctl -u kubelet -n 30 --no-pager
#   unable to load client CA file /etc/kubernetes/pki/ca-bundle.crt: no such file
vi /var/lib/kubelet/config.yaml       # authentication.x509.clientCAFile: /etc/kubernetes/pki/ca.crt
systemctl restart kubelet
exit
echo /var/lib/kubelet/config.yaml > ~/cka-answers/36-file.txt
kubectl get nodes -w
```
