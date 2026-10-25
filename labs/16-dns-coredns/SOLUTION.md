# Lời giải · Lab 16 · DNS trong cluster và CoreDNS

```bash
kubectl -n kube-system get svc kube-dns -o jsonpath='{.spec.clusterIP}' > ~/cka-answers/16-dns-ip.txt
echo cluster.local > ~/cka-answers/16-domain.txt

kubectl get pod client -n lab16 -o jsonpath='{.spec.dnsPolicy}'   # Default → dùng DNS của node
kubectl get pod client -n lab16 -o yaml > client.yaml
# đổi dnsPolicy: Default → ClusterFirst (hoặc xóa dòng), rồi
kubectl replace --force -f client.yaml
kubectl exec client -n lab16 -- nslookup web.lab16
```
```yaml
apiVersion: v1
kind: Pod
metadata: {name: custom-dns, namespace: lab16}
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers: ["1.1.1.1"]
    searches: ["lab16.svc.cluster.local"]
    options: [{name: ndots, value: "2"}]
  containers:
  - {name: c, image: busybox:1.36, command: ["sleep", "3600"]}
```
```bash
kubectl -n kube-system edit cm coredns     # thêm server block corp.internal ở cuối Corefile
kubectl -n kube-system rollout restart deploy coredns
kubectl run t --rm -it --image=busybox:1.36 --restart=Never -- nslookup legacy.corp.internal
```
