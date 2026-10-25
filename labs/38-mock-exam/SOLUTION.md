# Lời giải · Lab 38 · Đề thi thử CKA (2 giờ, 16 câu)

```bash
eval "$(./lab env)"
# 1
kubectl create ns mock-x && kubectl label ns mock-x env=exam
# 2
kubectl create deploy frontend -n mock-a --image=nginx:1.27 --replicas=3
kubectl set resources deploy frontend -n mock-a --requests=cpu=100m
kubectl patch deploy frontend -n mock-a -p '{"spec":{"strategy":{"rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}}}'
kubectl set image deploy/frontend -n mock-a nginx=nginx:1.28
kubectl annotate deploy/frontend -n mock-a kubernetes.io/change-cause='exam upgrade' --overwrite
# 3
kubectl create cm exam-cfg -n mock-a --from-literal=LEVEL=hard
kubectl create secret generic exam-sec -n mock-a --from-literal=token=abc123
#   cfg-pod: env LEVEL ← configMapKeyRef exam-cfg/LEVEL, TOKEN ← secretKeyRef exam-sec/token
# 4
kubectl autoscale deploy frontend -n mock-a --min=3 --max=6 --cpu=60%
# 5  gpu-pod: tolerations exam=true:NoSchedule + nodeSelector exam-role: gpu
# 6  logger: initContainers[tail] restartPolicy: Always, emptyDir chung tại /var/log
# 7
kubectl expose deploy frontend -n mock-a --name=frontend-np --type=NodePort --port=80 $do > np.yaml  # thêm nodePort: 30090
# 8  NetworkPolicy: podSelector app=db; from: [{namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: mock-a}}, podSelector: {matchLabels: {app: api}}}]
# 9
kubectl create ingress frontend -n mock-a --rule="exam.local/*=frontend-np:80"
# 10 PVC exam-data + Pod writer
# 11
kubectl create sa ci -n mock-a
kubectl create role ci -n mock-a --verb=create --resource=deployments
kubectl edit role ci -n mock-a       # thêm rule get,list cho pods
kubectl create rolebinding ci -n mock-a --role=ci --serviceaccount=mock-a:ci
# 12 static pod: file YAML vào staticPodPath của $NODE1
# 13
kubectl describe pod -n mock-c -l app=broken-api    # image sai + readiness port 8080
kubectl set image deploy/broken-api -n mock-c nginx=nginx:1.27
kubectl patch deploy broken-api -n mock-c --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":80}]'
# 14
kubectl patch svc backend -n mock-c -p '{"spec":{"selector":{"app":"backend"}}}'
# 15
kubectl get nodes --sort-by=.metadata.name -o jsonpath='{range .items[*]}{.metadata.name} {.status.nodeInfo.kubeletVersion}{"\n"}{end}' > ~/cka-answers/38-nodes.txt
# 16
kubectl create priorityclass exam-high --value=100000
#   vip: spec.priorityClassName: exam-high
```
YAML đầy đủ của từng câu nằm trong `tests/solutions/38.sh` của repo.
