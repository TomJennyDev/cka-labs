#!/usr/bin/env bash
# Lab 08 · Init container và sidecar container
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 08 "Init container và sidecar container"
expect "web có init container wait-db" "$(jp pod web -n lab08 '{.spec.initContainers[0].name}')" "wait-db"
check "wait-db chờ tên db.lab08.svc.cluster.local" bash -c "kubectl get pod web -n lab08 -o jsonpath='{.spec.initContainers[0].command} {.spec.initContainers[0].args}' | grep -q 'db.lab08'"
expect "Service db cổng 5432" "$(jp svc db -n lab08 '{.spec.ports[0].port}')" "5432"
expect "web Running" "$(jp pod web -n lab08 '{.status.phase}')" "Running"
expect "legacy có sidecar log-tail" "$(jp pod legacy -n lab08 '{.spec.initContainers[?(@.name=="log-tail")].restartPolicy}')" "Always"
check "kubectl logs legacy -c log-tail có log" bash -c "kubectl logs legacy -n lab08 -c log-tail | grep -q heartbeat"
end_verify
