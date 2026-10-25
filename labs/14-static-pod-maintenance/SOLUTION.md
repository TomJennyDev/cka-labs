# Lời giải · Lab 14 · Static pod, lập lịch thủ công và bảo trì node

```bash
eval "$(./lab env)"
kubectl run static-web --image=nginx:1.27 $do > static-web.yaml
./lab ssh $NODE1
#   trên node:
#   grep staticPodPath /var/lib/kubelet/config.yaml     → /etc/kubernetes/manifests
#   cat > /etc/kubernetes/manifests/static-web.yaml     (dán nội dung) ; exit
kubectl get pod static-web-$NODE1                         # mirror pod

kubectl run manual -n lab14 --image=nginx:1.27 $do > manual.yaml
# thêm  spec.nodeName: <tên NODE2>  rồi apply
kubectl apply -f manual.yaml

kubectl create pdb web-pdb -n lab14 --selector=app=web --min-available=2
kubectl drain $NODE1 --ignore-daemonsets --delete-emptydir-data
kubectl get nodes          # NODE1: Ready,SchedulingDisabled
```
