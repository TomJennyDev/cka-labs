#!/usr/bin/env bash
# Lab 38 · Đề thi thử CKA (2 giờ, 16 câu)
# File sinh tự động từ src/labs/level9.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl create ns mock-x && kubectl label ns mock-x env=exam
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata: {name: frontend, namespace: mock-a}
spec:
  replicas: 3
  strategy: {type: RollingUpdate, rollingUpdate: {maxSurge: 1, maxUnavailable: 0}}
  selector: {matchLabels: {app: frontend}}
  template:
    metadata: {labels: {app: frontend}}
    spec:
      containers:
      - {name: nginx, image: nginx:1.27, resources: {requests: {cpu: 100m}}}
---
apiVersion: v1
kind: ConfigMap
metadata: {name: exam-cfg, namespace: mock-a}
data: {LEVEL: hard}
---
apiVersion: v1
kind: Secret
metadata: {name: exam-sec, namespace: mock-a}
stringData: {token: abc123}
---
apiVersion: v1
kind: Pod
metadata: {name: cfg-pod, namespace: mock-a}
spec:
  containers:
  - name: c
    image: busybox:1.36
    command: ["sleep", "3600"]
    env:
    - {name: LEVEL, valueFrom: {configMapKeyRef: {name: exam-cfg, key: LEVEL}}}
    - {name: TOKEN, valueFrom: {secretKeyRef: {name: exam-sec, key: token}}}
---
apiVersion: v1
kind: Pod
metadata: {name: gpu-pod, namespace: mock-a}
spec:
  nodeSelector: {exam-role: gpu}
  tolerations: [{key: exam, operator: Equal, value: "true", effect: NoSchedule}]
  containers: [{name: nginx, image: nginx:1.27}]
---
apiVersion: v1
kind: Pod
metadata: {name: logger, namespace: mock-a}
spec:
  volumes: [{name: logs, emptyDir: {}}]
  initContainers:
  - name: tail
    image: busybox:1.36
    restartPolicy: Always
    command: ["sh", "-c", "tail -F /var/log/app.log"]
    volumeMounts: [{name: logs, mountPath: /var/log}]
  containers:
  - name: app
    image: busybox:1.36
    command: ["sh", "-c", "while true; do echo tick >> /var/log/app.log; sleep 2; done"]
    volumeMounts: [{name: logs, mountPath: /var/log}]
---
apiVersion: v1
kind: Service
metadata: {name: frontend-np, namespace: mock-a}
spec:
  type: NodePort
  selector: {app: frontend}
  ports: [{port: 80, targetPort: 80, nodePort: 30090}]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: db-access, namespace: mock-b}
spec:
  podSelector: {matchLabels: {app: db}}
  policyTypes: [Ingress]
  ingress:
  - from:
    - namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: mock-a}}
      podSelector: {matchLabels: {app: api}}
    ports: [{protocol: TCP, port: 80}]
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: exam-data, namespace: mock-a}
spec:
  accessModes: [ReadWriteOnce]
  resources: {requests: {storage: 1Gi}}
---
apiVersion: v1
kind: Pod
metadata: {name: writer, namespace: mock-a}
spec:
  containers:
  - {name: c, image: busybox:1.36, command: ["sh", "-c", "touch /data/ok; sleep 3600"], volumeMounts: [{name: d, mountPath: /data}]}
  volumes: [{name: d, persistentVolumeClaim: {claimName: exam-data}}]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: {name: ci, namespace: mock-a}
rules:
- {apiGroups: [apps], resources: [deployments], verbs: [create]}
- {apiGroups: [""], resources: [pods], verbs: [get, list]}
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata: {name: exam-high}
value: 100000
---
apiVersion: v1
kind: Pod
metadata: {name: vip, namespace: mock-a}
spec:
  priorityClassName: exam-high
  containers: [{name: nginx, image: nginx:1.27}]
EOF
kubectl rollout status deploy/frontend -n mock-a --timeout=180s
kubectl set image deploy/frontend -n mock-a nginx=nginx:1.28
kubectl annotate deploy/frontend -n mock-a kubernetes.io/change-cause='exam upgrade' --overwrite
kubectl autoscale deploy frontend -n mock-a --min=3 --max=6 --cpu-percent=60
kubectl create ingress frontend -n mock-a --rule="exam.local/*=frontend-np:80"
kubectl create sa ci -n mock-a
kubectl create rolebinding ci -n mock-a --role=ci --serviceaccount=mock-a:ci
kubectl run exam-static --image=nginx:1.27 --dry-run=client -o yaml > /tmp/exam-static.yaml
node_put "$NODE1" /tmp/exam-static.yaml "$(static_dir "$NODE1")/exam-static.yaml"
kubectl set image deploy/broken-api -n mock-c nginx=nginx:1.27
kubectl patch deploy broken-api -n mock-c --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":80}]'
kubectl patch svc backend -n mock-c -p '{"spec":{"selector":{"app":"backend"}}}'
kubectl get nodes --sort-by=.metadata.name -o jsonpath='{range .items[*]}{.metadata.name} {.status.nodeInfo.kubeletVersion}{"\n"}{end}' > "$ANS/38-nodes.txt"
kubectl rollout status deploy/frontend -n mock-a --timeout=180s
kubectl rollout status deploy/broken-api -n mock-c --timeout=180s
kubectl wait --for=condition=Ready pod/cfg-pod pod/gpu-pod pod/logger pod/writer pod/vip -n mock-a --timeout=180s
for i in $(seq 1 30); do [ "$(kubectl get pod "exam-static-$NODE1" -o jsonpath='{.status.phase}' 2>/dev/null)" = Running ] && break; sleep 3; done
sleep 5
