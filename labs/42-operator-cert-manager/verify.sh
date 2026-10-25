#!/usr/bin/env bash
# Lab 42 · Cài và dùng một Operator thật - cert-manager
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 42 "Cài và dùng một Operator thật - cert-manager"
for d in cert-manager cert-manager-cainjector cert-manager-webhook; do
  expect "Deployment $d sẵn sàng" "$(jp deploy "$d" -n cert-manager '{.status.conditions[?(@.type=="Available")].status}')" "True"
done
want="$(kubectl get crd -o name 2>/dev/null | grep 'cert-manager\.io$' | sed 's#.*/##' | sort | tr '\n' ' ')"
got="$(sed 's#.*/##; s/[[:space:]]//g; /^$/d' "$ANS/42-crds.txt" 2>/dev/null | tr '\n' ' ')"
check "Có CRD cert-manager trong cluster" test -n "$want"
expect "42-crds.txt đủ tên và đúng thứ tự" "$got" "${want:-<chưa có CRD>}"
check "42-subject.txt là kết quả kubectl explain của spec.subject" bash -c "grep -Eq 'FIELD:[[:space:]]+subject' '$ANS/42-subject.txt'"
expect "ClusterIssuer selfsigned Ready" "$(jp clusterissuer selfsigned '{.status.conditions[?(@.type=="Ready")].status}')" "True"
expect "Certificate web-cert Ready" "$(jp certificate web-cert -n lab42 '{.status.conditions[?(@.type=="Ready")].status}')" "True"
expect "Certificate cho web.lab42.svc" "$(jp certificate web-cert -n lab42 '{.spec.dnsNames[*]}')" "web.lab42.svc"
expect "Secret web-tls kiểu kubernetes.io/tls" "$(jp secret web-tls -n lab42 '{.type}')" "kubernetes.io/tls"
end_verify
