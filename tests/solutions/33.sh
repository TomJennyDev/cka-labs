#!/usr/bin/env bash
# Lab 33 · Troubleshooting ứng dụng: sáu Deployment hỏng
# File sinh tự động từ src/labs/level8.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
for i in $(seq 1 40); do r=$(kubectl get pod -n lab33 -l app=oom -o jsonpath='{.items[0].status.containerStatuses[0].lastState.terminated.reason}'); [ -n "$r" ] && break; sleep 3; done
echo "$r" > "$ANS/33-oom.txt"
kubectl set image deploy/img -n lab33 nginx=nginx:1.27
kubectl patch deploy cmd -n lab33 --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/command","value":["sleep","3600"]}]'
kubectl set resources deploy oom -n lab33 --limits=memory=256Mi
kubectl patch deploy pending -n lab33 --type=json -p '[{"op":"remove","path":"/spec/template/spec/nodeSelector"}]'
kubectl create cm app-settings -n lab33 --from-literal=MODE=prod
kubectl patch deploy notready -n lab33 --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/"}]'
for d in img cmd oom pending notready; do kubectl rollout status deploy/$d -n lab33 --timeout=180s; done
for i in $(seq 1 30); do [ "$(kubectl get deploy cfg -n lab33 -o jsonpath='{.status.readyReplicas}')" = 1 ] && break; sleep 3; done
