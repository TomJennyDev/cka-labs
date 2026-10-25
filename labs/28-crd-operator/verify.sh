#!/usr/bin/env bash
# Lab 28 · CustomResourceDefinition và Operator
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 28 "CustomResourceDefinition và Operator"
crd=backups.ops.example.com
expect "CRD: Backup, Namespaced, bk" "$(jp crd $crd '{.spec.names.kind}:{.spec.scope}:{.spec.names.shortNames[*]}')" "Backup:Namespaced:bk"
expect "CRD version v1 served và storage" "$(jp crd $crd '{.spec.versions[0].name}:{.spec.versions[0].served}:{.spec.versions[0].storage}')" "v1:true:true"
expect "schedule bắt buộc" "$(jp crd $crd '{.spec.versions[0].schema.openAPIV3Schema.properties.spec.required[*]}')" "schedule"
expect "retention từ 1 tới 30" "$(jp crd $crd '{.spec.versions[0].schema.openAPIV3Schema.properties.spec.properties.retention.minimum}-{.spec.versions[0].schema.openAPIV3Schema.properties.spec.properties.retention.maximum}')" "1-30"
check "kubectl get bk có cột SCHEDULE và RETENTION" bash -c "kubectl get bk -n lab28 | head -1 | grep -q 'SCHEDULE.*RETENTION'"
expect "nightly: 0 2 * * * / 7" "$(jp bk nightly -n lab28 '{.spec.schedule}/{.spec.retention}')" "0 2 * * */7"
check_not "Không có Backup bad" kubectl get bk bad -n lab28
bad_backup() { printf 'apiVersion: ops.example.com/v1\nkind: Backup\nmetadata: {name: probe, namespace: lab28}\nspec: {schedule: x, retention: 100}\n' | kubectl apply --dry-run=server -f -; }
check_not "API từ chối retention 100" bad_backup
expect "28-short.txt" "$(ans 28-short.txt)" "bk"
end_verify
