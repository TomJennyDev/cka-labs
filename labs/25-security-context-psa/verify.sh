#!/usr/bin/env bash
# Lab 25 · securityContext và Pod Security Admission
# File sinh tự động từ src/labs/level6.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 25 "securityContext và Pod Security Admission"
expect "lab25 enforce=restricted" "$(jp ns lab25 '{.metadata.labels.pod-security\.kubernetes\.io/enforce}')" "restricted"
expect "lab25 warn=restricted" "$(jp ns lab25 '{.metadata.labels.pod-security\.kubernetes\.io/warn}')" "restricted"
expect "api 1/1 sẵn sàng" "$(jp deploy api -n lab25 '{.status.readyReplicas}/{.status.updatedReplicas}')" "1/1"
pod=$(jp pods -n lab25 -l app=api '{range .items[*]}{.metadata.name}|{.metadata.deletionTimestamp}{"\n"}{end}' | awk -F'|' '$2==""{print $1; exit}')
tpl='{.spec.template.spec.securityContext.runAsNonRoot}/{.spec.template.spec.containers[0].securityContext.allowPrivilegeEscalation}/{.spec.template.spec.containers[0].securityContext.capabilities.drop[*]}'
expect "api: runAsNonRoot, không leo quyền, drop ALL" "$(jp deploy api -n lab25 "$tpl")" "true/false/ALL"
expect "api: seccomp RuntimeDefault" "$(jp deploy api -n lab25 '{.spec.template.spec.securityContext.seccompProfile.type}{.spec.template.spec.containers[0].securityContext.seccompProfile.type}')" "RuntimeDefault"
check "Pod api là Pod mới, đã qua admission restricted" test "$(jp pod "$pod" -n lab25 '{.metadata.creationTimestamp}')" \> "$(jp cm lab-state -n lab25 '{.data.t0}')"
expect "api chạy với UID 1000" "$(kubectl exec -n lab25 "$pod" -- id -u 2>/dev/null)" "1000"
expect "secure Running" "$(jp pod secure -n lab25 '{.status.phase}')" "Running"
expect "secure: root filesystem chỉ đọc" "$(jp pod secure -n lab25 '{.spec.containers[0].securityContext.readOnlyRootFilesystem}')" "true"
check_not "secure: không ghi được /x" kubectl exec secure -n lab25 -- touch /x
check "secure: ghi được /tmp" kubectl exec secure -n lab25 -- touch /tmp/ok
end_verify
