# Lời giải · Lab 04 · Sinh YAML nhanh và trích xuất bằng jsonpath

```bash
kubectl create deploy api --image=nginx:1.27 --replicas=2 $do > ~/cka-answers/04-api.yaml
# sửa file: dưới spec.template.metadata.labels thêm  tier: backend
kubectl apply -n lab04 -f ~/cka-answers/04-api.yaml
kubectl rollout status deploy/api -n lab04

kubectl get pods -n lab04 -o jsonpath='{range .items[*]}{.metadata.name} {.status.podIP}{"\n"}{end}' > ~/cka-answers/04-pod-ips.txt
kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}' > ~/cka-answers/04-node-ips.txt
kubectl get pods -n lab04 --sort-by=.metadata.name -o custom-columns=POD:.metadata.name,IMAGE:.spec.containers[*].image > ~/cka-answers/04-images.txt
```
