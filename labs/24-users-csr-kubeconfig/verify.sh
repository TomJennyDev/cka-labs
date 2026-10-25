#!/usr/bin/env bash
# Lab 24 · User mới bằng chứng chỉ, CSR và kubeconfig
# File sinh tự động từ src/labs/level6.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 24 "User mới bằng chứng chỉ, CSR và kubeconfig"
check "dev1.key là khóa RSA 2048" bash -c "openssl rsa -in '$ANS/dev1.key' -noout -text 2>/dev/null | grep -q '2048 bit'"
expect_match "CSR có CN=dev1 và O=developers" "$(openssl req -in "$ANS/dev1.csr" -noout -subject 2>/dev/null)" 'CN *= *dev1'
expect_match "CSR thuộc group developers" "$(openssl req -in "$ANS/dev1.csr" -noout -subject 2>/dev/null)" 'O *= *developers'
expect "CSR dev1 dùng signer client của API server" "$(jp csr dev1 '{.spec.signerName}')" "kubernetes.io/kube-apiserver-client"
expect "CSR dev1 hạn 1 ngày" "$(jp csr dev1 '{.spec.expirationSeconds}')" "86400"
expect "CSR dev1 đã được duyệt" "$(jp csr dev1 '{.status.conditions[0].type}')" "Approved"
check "dev1.crt là chứng chỉ của dev1" bash -c "openssl x509 -in '$ANS/dev1.crt' -noout -subject | grep -q dev1"
KC="$ANS/dev1.kubeconfig"
expect "kubeconfig: context hiện tại dev1@lab" "$(kubectl config current-context --kubeconfig "$KC" 2>/dev/null)" "dev1@lab"
expect "kubeconfig: namespace lab24" "$(kubectl config view --kubeconfig "$KC" -o jsonpath='{.contexts[?(@.name=="dev1@lab")].context.namespace}')" "lab24"
check "kubeconfig: cert được nhúng" bash -c "kubectl config view --raw --kubeconfig '$KC' -o jsonpath='{.users[0].user.client-certificate-data}' | grep -q ."
check "~/.kube/config không có user dev1" bash -c "! kubectl config view -o jsonpath='{.users[*].name}' | tr ' ' '\n' | grep -qx dev1"
expect "dev1 (qua kubeconfig) tạo được Deployment hello" "$(kubectl --kubeconfig "$KC" get deploy hello -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null)" "nginx:1.27"
expect "dev1: KHÔNG xem được node" "$(kubectl --kubeconfig "$KC" auth can-i list nodes 2>/dev/null)" "no"
expect "Group developers: delete deployments trong lab24" "$(kubectl auth can-i delete deployments.apps -n lab24 --as=someone --as-group=developers 2>/dev/null)" "yes"
expect "Group developers: KHÔNG đọc Secret" "$(kubectl auth can-i get secrets -n lab24 --as=someone --as-group=developers 2>/dev/null)" "no"
end_verify
