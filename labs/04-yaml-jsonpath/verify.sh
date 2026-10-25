#!/usr/bin/env bash
# Lab 04 · Sinh YAML nhanh và trích xuất bằng jsonpath
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 04 "Sinh YAML nhanh và trích xuất bằng jsonpath"
check "04-api.yaml tồn tại" test -s "$ANS/04-api.yaml"
check "04-api.yaml là Deployment api" grep -q 'name: api' "$ANS/04-api.yaml"
expect "Deployment api có 2 replica sẵn sàng" "$(jp deploy api -n lab04 '{.status.readyReplicas}')" "2"
expect "Pod template có tier=backend" "$(jp deploy api -n lab04 '{.spec.template.metadata.labels.tier}')" "backend"
want=$(kubectl get pods -n lab04 -o jsonpath='{range .items[*]}{.metadata.name} {.status.podIP}{"\n"}{end}' 2>/dev/null | sort)
expect "04-pod-ips.txt đúng" "$(sort "$ANS/04-pod-ips.txt" 2>/dev/null | sed '/^$/d')" "$(echo "$want" | sed '/^$/d')"
want=$(jp nodes '{.items[*].status.addresses[?(@.type=="InternalIP")].address}' | tr ' ' '\n' | sort | xargs)
expect "04-node-ips.txt đúng" "$(tr ' ' '\n' < "$ANS/04-node-ips.txt" 2>/dev/null | sed '/^$/d' | sort | xargs)" "$want"
want=$(kubectl get pods -n lab04 --sort-by=.metadata.name -o custom-columns=POD:.metadata.name,IMAGE:.spec.containers[*].image 2>/dev/null | awk '{print $1,$2}')
expect "04-images.txt đúng nội dung và thứ tự" "$(awk '{print $1,$2}' "$ANS/04-images.txt" 2>/dev/null)" "$want"
end_verify
