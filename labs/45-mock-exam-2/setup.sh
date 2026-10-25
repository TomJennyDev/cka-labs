#!/usr/bin/env bash
# Lab 45 · Đề thi thử 2 - chế độ phòng thi (2 giờ, 16 câu)
# File sinh tự động từ src/labs/level9-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env kind
detect_nodes
answers_dir; rm -rf "$ANS/m2-kust"
command -v openssl >/dev/null 2>&1 || die "Cần openssl trên máy chạy lab"
kubectl delete ns m2-ops m2-app m2-net m2-mon m2-store --ignore-not-found --wait=true >/dev/null 2>&1
kubectl delete pv m2-pv --ignore-not-found >/dev/null 2>&1
kubectl delete sc m2-retain --ignore-not-found >/dev/null 2>&1
kubectl delete pc m2-high --ignore-not-found >/dev/null 2>&1
kubectl delete clusterrole,clusterrolebinding pv-viewer --ignore-not-found >/dev/null 2>&1
kubectl delete crd widgets.lab.example.com --ignore-not-found >/dev/null 2>&1
kubectl delete gatewayclass m2-gc --ignore-not-found >/dev/null 2>&1
kubectl label node --all m2-agent- >/dev/null 2>&1
for n in "$CP" "$NODE1" "$NODE2"; do node_exec "$n" 'rm -f /root/45-*.txt' >/dev/null 2>&1; done
exam_hosts || info "Không cài được kubectl lên node, vẫn làm được từ máy của bạn"
for ns in m2-ops m2-app m2-net m2-mon m2-store; do kubectl create ns "$ns" >/dev/null; done
# 2 · kustomize base
mkdir -p "$ANS/m2-kust/base"
cat > "$ANS/m2-kust/base/deployment.yaml" <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata: {name: shop-ui}
spec:
  replicas: 1
  selector: {matchLabels: {app: shop-ui}}
  template:
    metadata: {labels: {app: shop-ui}}
    spec:
      containers: [{name: nginx, image: "nginx:1.27"}]
EOF
printf 'apiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nresources: [deployment.yaml]\n' > "$ANS/m2-kust/base/kustomization.yaml"
# 3 · CRD
kubectl apply -f - >/dev/null <<'EOF'
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata: {name: widgets.lab.example.com}
spec:
  group: lab.example.com
  scope: Namespaced
  names: {kind: Widget, plural: widgets, singular: widget, shortNames: [wd]}
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            required: [size, color]
            properties:
              size: {type: integer, minimum: 1, maximum: 5, description: "Kích thước, 1 tới 5"}
              color: {type: string, enum: [blue, green, red], description: "Màu của widget"}
EOF
# 4 · beacon on NODE2
kubectl apply -n m2-ops -f - >/dev/null <<EOF
apiVersion: v1
kind: Pod
metadata: {name: m2-beacon}
spec:
  nodeName: $NODE2
  containers: [{name: beacon, image: "busybox:1.36", command: ["sleep", "3600"]}]
EOF
# 5 · m2-web with 3 revisions
kubectl create deploy m2-web -n m2-app --image=nginx:1.27 --replicas=2 >/dev/null
kubectl rollout status deploy/m2-web -n m2-app --timeout=120s >/dev/null
kubectl set image deploy/m2-web -n m2-app nginx=nginx:1.28 >/dev/null
kubectl rollout status deploy/m2-web -n m2-app --timeout=120s >/dev/null
kubectl set image deploy/m2-web -n m2-app nginx=nginx:1.99 >/dev/null
# 6 · node labels
kubectl label node "$CP" "$NODE2" m2-agent=true --overwrite >/dev/null
# 7 · PriorityClass
kubectl create priorityclass m2-high --value=50000 --description="mock exam 2" >/dev/null
# 8, 10, 14 · networking
kubectl apply -n m2-net -f - >/dev/null <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata: {name: db}
spec:
  selector: {matchLabels: {app: db}}
  template:
    metadata: {labels: {app: db}}
    spec: {containers: [{name: nginx, image: "nginx:1.27", ports: [{containerPort: 80}]}]}
---
apiVersion: v1
kind: Service
metadata: {name: db}
spec: {selector: {app: db}, ports: [{port: 80}]}
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: m2-api}
spec:
  replicas: 2
  selector: {matchLabels: {app: m2-api}}
  template:
    metadata: {labels: {app: m2-api}}
    spec: {containers: [{name: nginx, image: "nginx:1.27", ports: [{name: http, containerPort: 80}]}]}
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: m2-backend}
spec:
  replicas: 2
  selector: {matchLabels: {app: backend}}
  template:
    metadata: {labels: {app: backend}}
    spec: {containers: [{name: nginx, image: "nginx:1.27", ports: [{containerPort: 80}]}]}
---
apiVersion: v1
kind: Service
metadata: {name: m2-backend}
spec: {selector: {app: back-end}, ports: [{port: 80, targetPort: 8080}]}
EOF
# 9 · Gateway API
if ! kubectl get crd httproutes.gateway.networking.k8s.io >/dev/null 2>&1; then
  kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.6.3/standard-install.yaml >/dev/null || die "Không tải được CRD Gateway API (cần internet)"
  kubectl wait --for=condition=Established crd/gateways.gateway.networking.k8s.io crd/httproutes.gateway.networking.k8s.io --timeout=60s >/dev/null
fi
printf 'apiVersion: gateway.networking.k8s.io/v1\nkind: GatewayClass\nmetadata: {name: m2-gc}\nspec: {controllerName: lab.example.com/gateway-controller}\n' | kubectl apply -f - >/dev/null
t="$(mktemp -d)"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "$t/k" -out "$t/c" -subj "/CN=m2.local" >/dev/null 2>&1
kubectl create secret tls m2-tls -n m2-net --cert="$t/c" --key="$t/k" >/dev/null; rm -rf "$t"
# 11 · storage
kubectl apply -f - >/dev/null <<'EOF'
apiVersion: v1
kind: PersistentVolume
metadata: {name: m2-pv}
spec:
  capacity: {storage: 1Gi}
  accessModes: [ReadWriteOnce]
  storageClassName: m2-manual
  persistentVolumeReclaimPolicy: Retain
  hostPath: {path: /tmp/m2-pv, type: DirectoryOrCreate}
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: m2-data, namespace: m2-store}
spec:
  accessModes: [ReadWriteMany]
  storageClassName: m2-manual
  resources: {requests: {storage: 1Gi}}
EOF
# 13 · broken shop
kubectl create cm m2-shop-cfg -n m2-app --from-literal=mode=prod >/dev/null
kubectl apply -n m2-app -f - >/dev/null <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata: {name: m2-shop}
spec:
  replicas: 2
  selector: {matchLabels: {app: m2-shop}}
  template:
    metadata: {labels: {app: m2-shop}}
    spec:
      containers:
      - name: nginx
        image: "nginx:1.27-alpnie"
        env:
        - name: MODE
          valueFrom: {configMapKeyRef: {name: m2-shop-cfg, key: MODE}}
EOF
# 15, 16 · logs and memory
kubectl apply -n m2-ops -f - >/dev/null <<'EOF'
apiVersion: v1
kind: Pod
metadata: {name: m2-logger}
spec:
  containers:
  - name: web
    image: busybox:1.36
    command: ["sh", "-c", "echo 'level=info msg=web ready'; echo 'level=error msg=should not be counted'; sleep 3600"]
  - name: worker
    image: busybox:1.36
    command: ["sh", "-c", "echo 'level=info msg=job start'; echo 'level=error msg=db timeout id=7'; echo 'level=warn msg=retry'; echo 'level=error msg=db timeout id=8'; echo 'level=info msg=job done'; echo 'level=error msg=queue full'; sleep 3600"]
---
apiVersion: v1
kind: Pod
metadata: {name: m2-hog}
spec:
  containers:
  - name: app
    image: busybox:1.36
    command: ["sh", "-c", "x=$(head -c 40m /dev/zero | tr '\\000' a); echo loaded; sleep 3600"]
---
apiVersion: v1
kind: Pod
metadata: {name: m2-idle}
spec:
  containers: [{name: app, image: "busybox:1.36", command: ["sleep", "3600"]}]
EOF
kubectl wait --for=condition=Ready pod --all -n m2-ops --timeout=120s >/dev/null 2>&1 || true
echo "Bắt đầu: $(date +%H:%M). Hết giờ: $(date -d '+120 min' +%H:%M 2>/dev/null || date -v+120M +%H:%M 2>/dev/null)"
echo "✔ Đã dựng xong tình huống."
