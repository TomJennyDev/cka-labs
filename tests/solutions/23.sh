#!/usr/bin/env bash
# Lab 23 · RBAC với Role, ClusterRole và ServiceAccount
# File sinh tự động từ src/labs/level6.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl create sa deployer -n lab23
kubectl apply -f - <<'EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: {name: deploy-manager, namespace: lab23}
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
EOF
kubectl create rolebinding deployer-binding -n lab23 --role=deploy-manager --serviceaccount=lab23:deployer
kubectl create clusterrole node-reader --verb=get,list,watch --resource=nodes
kubectl create clusterrolebinding ops-node-reader --clusterrole=node-reader --group=ops-team
kubectl create role log-reader -n lab23 --verb=get,list --resource=pods,pods/log
kubectl create rolebinding jane-logs -n lab23 --role=log-reader --user=jane
kubectl create sa auditor -n lab23
kubectl create rolebinding auditor-view -n lab23 --clusterrole=view --serviceaccount=lab23:auditor
echo ci-secrets-admin > "$ANS/23-binding.txt"
kubectl delete clusterrolebinding ci-secrets-admin
