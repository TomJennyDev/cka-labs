# Lời giải · Lab 13 · Anti-affinity, topology spread và PriorityClass

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: {name: web, namespace: lab13}
spec:
  replicas: 2
  selector: {matchLabels: {app: web}}
  template:
    metadata: {labels: {app: web}}
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - topologyKey: kubernetes.io/hostname
            labelSelector: {matchLabels: {app: web}}
      containers:
      - {name: nginx, image: nginx:1.27}
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: spread, namespace: lab13}
spec:
  replicas: 4
  selector: {matchLabels: {app: spread}}
  template:
    metadata: {labels: {app: spread}}
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        nodeTaintsPolicy: Honor
        labelSelector: {matchLabels: {app: spread}}
      containers:
      - {name: nginx, image: nginx:1.27}
```
```bash
kubectl get pc                     # cột GLOBAL-DEFAULT
echo team-default > ~/cka-answers/13-default-pc.txt
kubectl create priorityclass critical-app --value=1000000 --description=payment
kubectl run vip -n lab13 --image=nginx:1.27 $do > vip.yaml   # thêm spec.priorityClassName: critical-app
kubectl apply -f vip.yaml
kubectl get pod vip -n lab13 -o jsonpath='{.spec.priority}'   # 1000000
```
Nếu thiếu `nodeTaintsPolicy: Honor`, control plane (có taint) vẫn được tính là một miền với 0 Pod, nên mỗi worker chỉ nhận 1 Pod và 2 Pod còn lại đứng Pending. Có `Honor` thì chỉ tính 2 worker: 2 + 2.
