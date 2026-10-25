#!/usr/bin/env bash
# Lab 45 · Đề thi thử 2 - chế độ phòng thi (2 giờ, 16 câu)
# File sinh tự động từ src/labs/level9-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 45 "Đề thi thử 2 - chế độ phòng thi (2 giờ, 16 câu)"
can() { kubectl auth can-i "$@" 2>/dev/null; }
exam_task 1 6 "RBAC cho ServiceAccount audit"
check "SA audit" exists sa audit -n m2-ops
expect "ClusterRoleBinding pv-viewer dùng ClusterRole pv-viewer" "$(jp clusterrolebinding pv-viewer '{.roleRef.kind}/{.roleRef.name}')" "ClusterRole/pv-viewer"
expect "audit list persistentvolumes" "$(can list persistentvolumes --as=system:serviceaccount:m2-ops:audit)" "yes"
expect "audit watch storageclasses" "$(can watch storageclasses --as=system:serviceaccount:m2-ops:audit)" "yes"
expect "audit không xóa được PV" "$(can delete persistentvolumes --as=system:serviceaccount:m2-ops:audit)" "no"

exam_task 2 5 "Kustomize overlay prod"
check "Có overlays/prod/kustomization.yaml" test -f "$ANS/m2-kust/overlays/prod/kustomization.yaml"
check "Base vẫn dùng nginx:1.27" grep -q 'nginx:1.27' "$ANS/m2-kust/base/deployment.yaml"
expect "shop-ui trong m2-app: 2 replica, nginx:1.28" "$(jp deploy shop-ui -n m2-app '{.spec.replicas}:{.spec.template.spec.containers[0].image}')" "2:nginx:1.28"
expect "shop-ui 2 Pod sẵn sàng" "$(jp deploy shop-ui -n m2-app '{.status.readyReplicas}')" "2"

exam_task 3 6 "Widget blue"
expect "Widget blue size 3, color blue" "$(jp widget blue -n m2-app '{.spec.size}:{.spec.color}')" "3:blue"

exam_task 4 8 "crictl: container ID của beacon"
cid="$(jp pod m2-beacon -n m2-ops '{.status.containerStatuses[0].containerID}')"; cid="${cid#*://}"
expect "/root/45-beacon.txt trên $NODE2" "$(node_exec "$NODE2" 'cat /root/45-beacon.txt 2>/dev/null' | tr -d '[:space:]')" "${cid:0:13}"

exam_task 5 5 "Rollback m2-web về revision 1"
expect "m2-web dùng nginx:1.27" "$(jp deploy m2-web -n m2-app '{.spec.template.spec.containers[0].image}')" "nginx:1.27"
expect "m2-web 2 Pod sẵn sàng" "$(jp deploy m2-web -n m2-app '{.status.readyReplicas}/{.status.updatedReplicas}')" "2/2"

exam_task 6 5 "DaemonSet m2-agent"
expect "m2-agent chọn node m2-agent=true" "$(jp ds m2-agent -n m2-app '{.spec.template.spec.nodeSelector.m2-agent}')" "true"
expect "m2-agent chạy trên đúng 2 node và sẵn sàng" "$(jp ds m2-agent -n m2-app '{.status.desiredNumberScheduled}/{.status.numberReady}')" "2/2"

exam_task 7 5 "Pod m2-vip"
expect "QoS Guaranteed" "$(jp pod m2-vip -n m2-app '{.status.qosClass}')" "Guaranteed"
expect "requests cpu 100m, memory 64Mi" "$(jp pod m2-vip -n m2-app '{.spec.containers[0].resources.requests.cpu}/{.spec.containers[0].resources.requests.memory}')" "100m/64Mi"
expect "PriorityClass m2-high (50000)" "$(jp pod m2-vip -n m2-app '{.spec.priorityClassName}/{.spec.priority}')" "m2-high/50000"

exam_task 8 6 "NetworkPolicy db-guard"
expect "db-guard chọn app=db" "$(jp netpol db-guard -n m2-net '{.spec.podSelector.matchLabels.app}')" "db"
check "role=api trong m2-net → db: được" can_reach m2-net http://db.m2-net role=api
check_not "Pod khác trong m2-net → db: bị chặn" can_reach m2-net http://db.m2-net role=web
check "Pod trong m2-mon → db: được" can_reach m2-mon http://db.m2-net
check_not "Pod trong m2-ops → db: bị chặn" can_reach m2-ops http://db.m2-net

exam_task 9 8 "Gateway và HTTPRoute"
expect "Gateway m2-gw class m2-gc" "$(jp gateway m2-gw -n m2-net '{.spec.gatewayClassName}')" "m2-gc"
expect "Listener https" "$(jp gateway m2-gw -n m2-net '{.spec.listeners[?(@.name=="https")].protocol}:{.spec.listeners[?(@.name=="https")].port}:{.spec.listeners[?(@.name=="https")].hostname}')" "HTTPS:443:m2.local"
expect "Listener dùng Secret m2-tls" "$(jp gateway m2-gw -n m2-net '{.spec.listeners[?(@.name=="https")].tls.certificateRefs[0].name}')" "m2-tls"
expect "m2-route gắn m2-gw/https" "$(jp httproute m2-route -n m2-net '{.spec.parentRefs[0].name}/{.spec.parentRefs[0].sectionName}')" "m2-gw/https"
expect "m2-route hostname m2.local" "$(jp httproute m2-route -n m2-net '{.spec.hostnames[*]}')" "m2.local"
expect "m2-route tới m2-api:80" "$(jp httproute m2-route -n m2-net '{.spec.rules[0].backendRefs[0].name}:{.spec.rules[0].backendRefs[0].port}')" "m2-api:80"
expect "Thêm header x-env: exam" "$(jp httproute m2-route -n m2-net '{.spec.rules[0].filters[?(@.type=="RequestHeaderModifier")].requestHeaderModifier.add[0].name}={.spec.rules[0].filters[?(@.type=="RequestHeaderModifier")].requestHeaderModifier.add[0].value}')" "x-env=exam"

exam_task 10 6 "Service m2-api"
expect "ClusterIP cổng 80, targetPort http" "$(jp svc m2-api -n m2-net '{.spec.type}:{.spec.ports[0].port}:{.spec.ports[0].targetPort}')" "ClusterIP:80:http"
expect "sessionAffinity ClientIP" "$(jp svc m2-api -n m2-net '{.spec.sessionAffinity}')" "ClientIP"
check "Gọi được http://m2-api.m2-net" can_reach m2-net http://m2-api.m2-net

exam_task 11 5 "PVC m2-data Bound"
expect "m2-data Bound với m2-pv" "$(jp pvc m2-data -n m2-store '{.status.phase}/{.spec.volumeName}')" "Bound/m2-pv"
expect "m2-data vẫn 1Gi" "$(jp pvc m2-data -n m2-store '{.spec.resources.requests.storage}')" "1Gi"
expect "PV không bị sửa (chỉ ReadWriteOnce)" "$(jp pv m2-pv '{.spec.accessModes[*]}')" "ReadWriteOnce"

exam_task 12 5 "StorageClass m2-retain"
defp="$(kubectl get sc -o jsonpath='{range .items[?(@.metadata.annotations.storageclass\.kubernetes\.io/is-default-class=="true")]}{.metadata.name} {.provisioner}{"\n"}{end}' 2>/dev/null | grep -v '^m2-retain ' | head -1 | awk '{print $2}')"
expect "m2-retain: provisioner, Retain, WaitForFirstConsumer" "$(jp sc m2-retain '{.provisioner}/{.reclaimPolicy}/{.volumeBindingMode}')" "$defp/Retain/WaitForFirstConsumer"
expect "PVC m2-logs Bound, lớp m2-retain" "$(jp pvc m2-logs -n m2-store '{.status.phase}/{.spec.storageClassName}')" "Bound/m2-retain"
expect "m2-logs-pod Running, gắn /logs" "$(jp pod m2-logs-pod -n m2-store '{.status.phase}:{.spec.containers[0].volumeMounts[?(@.mountPath=="/logs")].mountPath}')" "Running:/logs"

exam_task 13 10 "Sửa m2-shop"
expect "m2-shop 2/2 sẵn sàng" "$(jp deploy m2-shop -n m2-app '{.status.readyReplicas}/{.status.updatedReplicas}')" "2/2"
expect "Image nginx:1.27" "$(jp deploy m2-shop -n m2-app '{.spec.template.spec.containers[0].image}')" "nginx:1.27"
expect "MODE vẫn lấy từ ConfigMap m2-shop-cfg" "$(jp deploy m2-shop -n m2-app '{.spec.template.spec.containers[0].env[?(@.name=="MODE")].valueFrom.configMapKeyRef.name}')" "m2-shop-cfg"
expect "MODE=prod trong container" "$(kubectl exec -n m2-app deploy/m2-shop -- printenv MODE 2>/dev/null | tr -d '[:space:]')" "prod"

exam_task 14 8 "Sửa Service m2-backend"
expect "Deployment m2-backend không bị sửa" "$(jp deploy m2-backend -n m2-net '{.spec.template.metadata.labels.app}:{.spec.replicas}')" "backend:2"
expect "m2-backend có 2 endpoint" "$(jp endpointslices -n m2-net -l kubernetes.io/service-name=m2-backend '{.items[*].endpoints[*].addresses[0]}' | wc -w | tr -d ' ')" "2"
check "Gọi được http://m2-backend.m2-net" can_reach m2-net http://m2-backend.m2-net

exam_task 15 6 "Log lỗi của container worker"
want="$(printf 'level=error msg=db timeout id=7\nlevel=error msg=db timeout id=8\nlevel=error msg=queue full')"
expect "/root/45-errors.txt trên $NODE1" "$(node_exec "$NODE1" 'cat /root/45-errors.txt 2>/dev/null' | sed '/^$/d')" "$want"

exam_task 16 6 "Pod tốn memory nhất"
expect "/root/45-top.txt trên $CP" "$(node_exec "$CP" 'cat /root/45-top.txt 2>/dev/null' | tr -d '[:space:]')" "m2-hog"
exam_end
end_verify
