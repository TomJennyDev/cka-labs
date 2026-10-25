#!/usr/bin/env bash
# Lab 16 · DNS trong cluster và CoreDNS
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl -n kube-system get svc kube-dns -o jsonpath='{.spec.clusterIP}' > "$ANS/16-dns-ip.txt"
echo cluster.local > "$ANS/16-domain.txt"
kubectl get pod client -n lab16 -o yaml | sed 's/dnsPolicy: Default/dnsPolicy: ClusterFirst/' > /tmp/client.yaml
kubectl replace --force -f /tmp/client.yaml
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata: {name: custom-dns, namespace: lab16}
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers: ["1.1.1.1"]
    searches: ["lab16.svc.cluster.local"]
    options: [{name: ndots, value: "2"}]
  containers:
  - {name: c, image: busybox:1.36, command: ["sleep", "3600"]}
EOF
kubectl -n kube-system get cm coredns -o jsonpath='{.data.Corefile}' > /tmp/Corefile
printf 'corp.internal:53 {\n    errors\n    hosts {\n        10.10.10.10 legacy.corp.internal\n    }\n}\n' >> /tmp/Corefile
kubectl -n kube-system create cm coredns --from-file=Corefile=/tmp/Corefile --dry-run=client -o yaml | kubectl apply -f -
kubectl -n kube-system rollout restart deploy coredns
kubectl -n kube-system rollout status deploy coredns --timeout=120s
kubectl wait --for=condition=Ready pod/client -n lab16 --timeout=90s
sleep 5
