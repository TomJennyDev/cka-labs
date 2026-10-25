#!/usr/bin/env bash
# Lab 02 · kubectl, namespace, context và Kubernetes API
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 02 "kubectl, namespace, context và Kubernetes API"
expect "Namespace lab02 có label team=blue" "$(jp ns lab02 '{.metadata.labels.team}')" "blue"
expect "Context lab02-ctx có namespace lab02" "$(kubectl config view -o jsonpath='{.contexts[?(@.name=="lab02-ctx")].context.namespace}')" "lab02"
cur=$(kubectl config current-context)
check "Context hiện tại không phải lab02-ctx" test "$cur" != "lab02-ctx"
expect "02-cronjob-api.txt" "$(tr -d '[:space:]' < "$ANS/02-cronjob-api.txt" 2>/dev/null)" "batch/v1"
expect "02-cluster-scoped.txt" "$(tr -d '[:space:]' < "$ANS/02-cluster-scoped.txt" 2>/dev/null)" "$(kubectl api-resources --namespaced=false --no-headers 2>/dev/null | wc -l | tr -d ' ')"
expect "02-db-pod.txt" "$(tr -d '[:space:]' < "$ANS/02-db-pod.txt" 2>/dev/null)" "$(jp pods -n lab02-apps -l tier=db '{.items[0].metadata.name}')"
expect "02-db-node.txt" "$(tr -d '[:space:]' < "$ANS/02-db-node.txt" 2>/dev/null)" "$(jp pods -n lab02-apps -l tier=db '{.items[0].spec.nodeName}')"
end_verify
