#!/usr/bin/env bash
# Lab 23 · RBAC với Role, ClusterRole và ServiceAccount
# File sinh tự động từ src/labs/level6.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 23 "RBAC với Role, ClusterRole và ServiceAccount"
sa=system:serviceaccount:lab23
can() { kubectl auth can-i "$@" 2>/dev/null; }
expect "deployer: delete deployments trong lab23" "$(can delete deployments.apps -n lab23 --as=$sa:deployer)" "yes"
expect "deployer: list pods trong lab23" "$(can list pods -n lab23 --as=$sa:deployer)" "yes"
expect "deployer: KHÔNG delete pods" "$(can delete pods -n lab23 --as=$sa:deployer)" "no"
expect "deployer: KHÔNG tạo deployment ở default" "$(can create deployments.apps -n default --as=$sa:deployer)" "no"
expect "Binding deployer-binding dùng Role deploy-manager" "$(jp rolebinding deployer-binding -n lab23 '{.roleRef.kind}/{.roleRef.name}')" "Role/deploy-manager"
expect "Group ops-team: list nodes" "$(can list nodes --as=x --as-group=ops-team)" "yes"
expect "Group ops-team: KHÔNG delete nodes" "$(can delete nodes --as=x --as-group=ops-team)" "no"
expect "jane: get pods/log trong lab23" "$(can get pods --subresource=log -n lab23 --as=jane)" "yes"
expect "jane: KHÔNG delete pods" "$(can delete pods -n lab23 --as=jane)" "no"
expect "jane: KHÔNG đọc pods ở default" "$(can get pods -n default --as=jane)" "no"
expect "auditor: list deployments trong lab23" "$(can list deployments.apps -n lab23 --as=$sa:auditor)" "yes"
expect "auditor: KHÔNG list deployments ở default" "$(can list deployments.apps -n default --as=$sa:auditor)" "no"
expect "auditor: KHÔNG đọc Secret (view không có)" "$(can get secrets -n lab23 --as=$sa:auditor)" "no"
expect "23-binding.txt" "$(ans 23-binding.txt)" "ci-secrets-admin"
expect "legacy-bot: KHÔNG delete secrets" "$(can delete secrets -n lab23 --as=$sa:legacy-bot)" "no"
expect "legacy-bot: vẫn đọc ConfigMap" "$(can get configmaps -n lab23 --as=$sa:legacy-bot)" "yes"
end_verify
