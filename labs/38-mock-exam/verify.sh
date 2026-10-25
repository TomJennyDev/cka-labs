#!/usr/bin/env bash
# Lab 38 · Đề thi thử CKA (2 giờ, 16 câu)
# File sinh tự động từ src/labs/level9.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 38 "Đề thi thử CKA (2 giờ, 16 câu)"
exam_task 1 4 "Namespace mock-x"
expect "mock-x có env=exam" "$(jp ns mock-x '{.metadata.labels.env}')" "exam"
exam_task 2 8 "Deployment frontend"
expect "3 replica, nginx:1.28, request 100m" "$(jp deploy frontend -n mock-a '{.spec.template.spec.containers[0].image}:{.spec.template.spec.containers[0].resources.requests.cpu}')" "nginx:1.28:100m"
expect_ge "Ít nhất 3 Pod sẵn sàng" "$(jp deploy frontend -n mock-a '{.status.readyReplicas}')" 3
expect "maxSurge 1, maxUnavailable 0" "$(jp deploy frontend -n mock-a '{.spec.strategy.rollingUpdate.maxSurge}/{.spec.strategy.rollingUpdate.maxUnavailable}')" "1/0"
check "change-cause exam upgrade" bash -c "kubectl rollout history deploy/frontend -n mock-a | grep -q 'exam upgrade'"
exam_task 3 5 "ConfigMap, Secret, cfg-pod"
envs=$(kubectl exec cfg-pod -n mock-a -- env 2>/dev/null)
check "cfg-pod có LEVEL=hard" grep -qx LEVEL=hard <<<"$envs"
check "cfg-pod có TOKEN=abc123" grep -qx TOKEN=abc123 <<<"$envs"
expect "TOKEN lấy từ Secret exam-sec" "$(jp pod cfg-pod -n mock-a '{.spec.containers[0].env[?(@.name=="TOKEN")].valueFrom.secretKeyRef.name}')" "exam-sec"
exam_task 4 6 "HPA frontend"
expect "3–6 replica, CPU 60%" "$(jp hpa frontend -n mock-a '{.spec.minReplicas}-{.spec.maxReplicas}:{.spec.metrics[0].resource.target.averageUtilization}')" "3-6:60"
exam_task 5 6 "gpu-pod trên $NODE2"
expect "gpu-pod Running trên $NODE2" "$(jp pod gpu-pod -n mock-a '{.status.phase}:{.spec.nodeName}')" "Running:$NODE2"
exam_task 6 5 "logger với sidecar"
expect "Sidecar tail là native sidecar" "$(jp pod logger -n mock-a '{.spec.initContainers[?(@.name=="tail")].restartPolicy}')" "Always"
check "Log của sidecar có tick" bash -c "kubectl logs logger -n mock-a -c tail | grep -q tick"
exam_task 7 6 "Service frontend-np"
expect "NodePort 30090 cổng 80" "$(jp svc frontend-np -n mock-a '{.spec.type}:{.spec.ports[0].nodePort}:{.spec.ports[0].port}')" "NodePort:30090:80"
expect_ge "Có endpoint" "$(jp endpointslices -n mock-a -l kubernetes.io/service-name=frontend-np '{.items[*].endpoints[*].addresses[0]}' | wc -w | tr -d ' ')" 3
exam_task 8 8 "NetworkPolicy db-access"
check "api ở mock-a → db: được" can_reach mock-a http://db.mock-b app=api
check_not "web ở mock-a → db: bị chặn" can_reach mock-a http://db.mock-b app=web
check_not "api ở mock-b → db: bị chặn" can_reach mock-b http://db.mock-b app=api
exam_task 9 5 "Ingress frontend"
expect "exam.local / Prefix → frontend-np:80" "$(jp ingress frontend -n mock-a '{.spec.rules[0].host}:{.spec.rules[0].http.paths[0].path}:{.spec.rules[0].http.paths[0].pathType}:{.spec.rules[0].http.paths[0].backend.service.name}:{.spec.rules[0].http.paths[0].backend.service.port.number}')" "exam.local:/:Prefix:frontend-np:80"
exam_task 10 6 "PVC và writer"
expect "exam-data Bound 1Gi RWO" "$(jp pvc exam-data -n mock-a '{.status.phase}:{.spec.resources.requests.storage}:{.spec.accessModes[0]}')" "Bound:1Gi:ReadWriteOnce"
check "/data/ok tồn tại" kubectl exec writer -n mock-a -- test -f /data/ok
exam_task 11 6 "RBAC cho SA ci"
sa=system:serviceaccount:mock-a:ci
expect "ci: create deployments" "$(kubectl auth can-i create deployments.apps -n mock-a --as=$sa 2>/dev/null)" "yes"
expect "ci: list pods" "$(kubectl auth can-i list pods -n mock-a --as=$sa 2>/dev/null)" "yes"
expect "ci: KHÔNG delete pods" "$(kubectl auth can-i delete pods -n mock-a --as=$sa 2>/dev/null)" "no"
expect "ci: KHÔNG gì ở default" "$(kubectl auth can-i list pods -n default --as=$sa 2>/dev/null)" "no"
exam_task 12 6 "Static pod"
expect "exam-static-$NODE1 Running" "$(jp pod "exam-static-$NODE1" '{.status.phase}')" "Running"
check "Là mirror pod" test -n "$(jp pod "exam-static-$NODE1" '{.metadata.annotations.kubernetes\.io/config\.mirror}')"
exam_task 13 10 "Sửa broken-api"
expect "broken-api 2/2 sẵn sàng" "$(jp deploy broken-api -n mock-c '{.status.readyReplicas}')" "2"
check "Vẫn có readinessProbe" test -n "$(jp deploy broken-api -n mock-c '{.spec.template.spec.containers[0].readinessProbe.httpGet.port}')"
exam_task 14 8 "Service backend"
check "Gọi được http://backend.mock-c" can_reach mock-c http://backend.mock-c
expect "Deployment backend không đổi" "$(jp deploy backend -n mock-c '{.spec.template.metadata.labels.app}:{.spec.replicas}')" "backend:2"
exam_task 15 6 "Danh sách node"
want=$(kubectl get nodes --sort-by=.metadata.name -o jsonpath='{range .items[*]}{.metadata.name} {.status.nodeInfo.kubeletVersion}{"\n"}{end}' 2>/dev/null)
expect "38-nodes.txt đúng nội dung và thứ tự" "$(ansraw 38-nodes.txt | sed '/^$/d')" "$(echo "$want" | sed '/^$/d')"
exam_task 16 5 "PriorityClass và vip"
expect "exam-high = 100000" "$(jp pc exam-high '{.value}')" "100000"
expect "vip có priority 100000" "$(jp pod vip -n mock-a '{.spec.priority}')" "100000"
exam_end
end_verify
