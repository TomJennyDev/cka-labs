#!/usr/bin/env bash
# Lab 23 · RBAC với Role, ClusterRole và ServiceAccount
# File sinh tự động từ src/labs/level6.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS/23-binding.txt"
ns_fresh lab23
kubectl delete clusterrole node-reader secret-admin-lab23 --ignore-not-found >/dev/null
kubectl delete clusterrolebinding ops-node-reader ci-secrets-admin --ignore-not-found >/dev/null
kubectl create sa legacy-bot -n lab23 >/dev/null
kubectl create role cm-reader -n lab23 --verb=get,list --resource=configmaps >/dev/null
kubectl create rolebinding legacy-cm -n lab23 --role=cm-reader --serviceaccount=lab23:legacy-bot >/dev/null
kubectl create clusterrole secret-admin-lab23 --verb=get,list,delete --resource=secrets >/dev/null
kubectl create clusterrolebinding ci-secrets-admin --clusterrole=secret-admin-lab23 --serviceaccount=lab23:legacy-bot >/dev/null
echo "✔ Đã dựng xong tình huống."
