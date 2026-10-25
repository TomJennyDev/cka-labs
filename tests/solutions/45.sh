#!/usr/bin/env bash
# Lab 45 · Đề thi thử 2 - chế độ phòng thi (2 giờ, 16 câu)
# File sinh tự động từ src/labs/level9-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl create sa audit -n m2-ops
kubectl create clusterrole pv-viewer --verb=get,list,watch --resource=persistentvolumes,storageclasses
kubectl create clusterrolebinding pv-viewer --clusterrole=pv-viewer --serviceaccount=m2-ops:audit
mkdir -p "$ANS/m2-kust/overlays/prod"
printf 'apiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nresources: [../../base]\nnamespace: m2-app\nreplicas: [{name: shop-ui, count: 2}]\nimages: [{name: nginx, newTag: "1.28"}]\n' > "$ANS/m2-kust/overlays/prod/kustomization.yaml"
kubectl apply -k "$ANS/m2-kust/overlays/prod"
printf 'apiVersion: lab.example.com/v1\nkind: Widget\nmetadata: {name: blue, namespace: m2-app}\nspec: {size: 3, color: blue}\n' | kubectl apply -f -
cid="$(kubectl get pod m2-beacon -n m2-ops -o jsonpath='{.status.containerStatuses[0].containerID}')"; cid="${cid#*://}"
node_exec "$NODE2" "echo ${cid:0:13} > /root/45-beacon.txt"
kubectl rollout undo deploy m2-web -n m2-app --to-revision=1
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: DaemonSet
metadata: {name: m2-agent, namespace: m2-app}
spec:
  selector: {matchLabels: {app: m2-agent}}
  template:
    metadata: {labels: {app: m2-agent}}
    spec:
      nodeSelector: {m2-agent: "true"}
      tolerations: [{key: node-role.kubernetes.io/control-plane, operator: Exists, effect: NoSchedule}]
      containers: [{name: agent, image: "busybox:1.36", command: ["sleep", "3600"]}]
---
apiVersion: v1
kind: Pod
metadata: {name: m2-vip, namespace: m2-app}
spec:
  priorityClassName: m2-high
  containers:
  - name: nginx
    image: nginx:1.27
    resources:
      requests: {cpu: 100m, memory: 64Mi}
      limits: {cpu: 100m, memory: 64Mi}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: db-guard, namespace: m2-net}
spec:
  podSelector: {matchLabels: {app: db}}
  policyTypes: [Ingress]
  ingress:
  - from:
    - podSelector: {matchLabels: {role: api}}
    - namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: m2-mon}}
    ports: [{protocol: TCP, port: 80}]
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata: {name: m2-gw, namespace: m2-net}
spec:
  gatewayClassName: m2-gc
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    hostname: m2.local
    tls: {mode: Terminate, certificateRefs: [{name: m2-tls}]}
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: {name: m2-route, namespace: m2-net}
spec:
  parentRefs: [{name: m2-gw, sectionName: https}]
  hostnames: [m2.local]
  rules:
  - matches: [{path: {type: PathPrefix, value: /}}]
    filters:
    - type: RequestHeaderModifier
      requestHeaderModifier: {add: [{name: x-env, value: exam}]}
    backendRefs: [{name: m2-api, port: 80}]
---
apiVersion: v1
kind: Service
metadata: {name: m2-api, namespace: m2-net}
spec:
  selector: {app: m2-api}
  sessionAffinity: ClientIP
  ports: [{port: 80, targetPort: http}]
EOF
prov="$(kubectl get sc -o jsonpath='{range .items[?(@.metadata.annotations.storageclass\.kubernetes\.io/is-default-class=="true")]}{.metadata.name} {.provisioner}{"\n"}{end}' | grep -v '^m2-retain ' | head -1 | awk '{print $2}')"
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata: {name: m2-retain}
provisioner: $prov
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: m2-logs, namespace: m2-store}
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: m2-retain
  resources: {requests: {storage: 500Mi}}
---
apiVersion: v1
kind: Pod
metadata: {name: m2-logs-pod, namespace: m2-store}
spec:
  containers:
  - {name: c, image: "busybox:1.36", command: ["sleep", "3600"], volumeMounts: [{name: l, mountPath: /logs}]}
  volumes: [{name: l, persistentVolumeClaim: {claimName: m2-logs}}]
EOF
kubectl get pvc m2-data -n m2-store -o yaml | sed 's/ReadWriteMany/ReadWriteOnce/' | sed '/^status:/,$d' > /tmp/m2-data.yaml
kubectl replace --force -f /tmp/m2-data.yaml
kubectl set image deploy/m2-shop -n m2-app nginx=nginx:1.27
kubectl patch deploy m2-shop -n m2-app --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/env/0/valueFrom/configMapKeyRef/key","value":"mode"}]'
kubectl patch svc m2-backend -n m2-net --type=json -p '[{"op":"replace","path":"/spec/selector","value":{"app":"backend"}},{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'
kubectl logs m2-logger -n m2-ops -c worker | grep 'level=error' > /tmp/m2-errors.txt
node_put "$NODE1" /tmp/m2-errors.txt /root/45-errors.txt
node_exec "$CP" 'echo m2-hog > /root/45-top.txt'
kubectl rollout status deploy/m2-web -n m2-app --timeout=180s
kubectl rollout status deploy/m2-shop -n m2-app --timeout=180s
kubectl rollout status deploy/shop-ui -n m2-app --timeout=180s
kubectl rollout status ds/m2-agent -n m2-app --timeout=180s
kubectl wait --for=condition=Ready pod/m2-vip -n m2-app --timeout=120s
kubectl wait --for=condition=Ready pod/m2-logs-pod -n m2-store --timeout=180s
for i in $(seq 1 30); do [ "$(kubectl get pvc m2-data -n m2-store -o jsonpath='{.status.phase}')" = Bound ] && break; sleep 2; done
sleep 5
