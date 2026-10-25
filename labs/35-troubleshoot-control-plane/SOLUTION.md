# Lời giải · Lab 35 · Troubleshooting control plane: scheduler và controller-manager

```bash
kubectl get rs -n lab35                       # trống
kubectl -n kube-system get pods | grep -E 'scheduler|controller'
./lab ssh $CP
crictl ps -a | grep controller-manager        # Exited
crictl logs <id>                              # exec: "kube-controller-manegr": executable file not found
vi /etc/kubernetes/manifests/kube-controller-manager.yaml     # sửa thành kube-controller-manager
crictl ps -a | grep scheduler
crictl logs <id>                              # stat /etc/kubernetes/scheduler.config: no such file or directory
vi /etc/kubernetes/manifests/kube-scheduler.yaml              # --kubeconfig=/etc/kubernetes/scheduler.conf
exit
kubectl get pods -n lab35 -w
printf 'kube-controller-manager\nkube-scheduler\n' > ~/cka-answers/35-components.txt
```
