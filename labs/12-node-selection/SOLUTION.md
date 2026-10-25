# Lời giải · Lab 12 · nodeSelector, node affinity, taint và toleration

```bash
eval "$(./lab env)"
kubectl label node $NODE1 disktype=ssd
kubectl label node $NODE2 disktype=hdd accelerator=nvidia
kubectl taint node $NODE2 dedicated=gpu:NoSchedule
kubectl run fast -n lab12 --image=nginx:1.27 $do > fast.yaml   # thêm nodeSelector rồi apply
```
```yaml
# fast
spec:
  nodeSelector: {disktype: ssd}
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: gpu-job, namespace: lab12}
spec:
  replicas: 2
  selector: {matchLabels: {app: gpu-job}}
  template:
    metadata: {labels: {app: gpu-job}}
    spec:
      tolerations:
      - {key: dedicated, operator: Equal, value: gpu, effect: NoSchedule}
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - {key: accelerator, operator: In, values: [nvidia]}
      containers:
      - {name: job, image: busybox:1.36, command: ["sleep", "3600"]}
---
apiVersion: v1
kind: Pod
metadata: {name: flex, namespace: lab12}
spec:
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 80
        preference:
          matchExpressions:
          - {key: disktype, operator: In, values: [hdd]}
  containers:
  - {name: flex, image: nginx:1.27}
```
