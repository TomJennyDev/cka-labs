#!/usr/bin/env bash
# Lab 23 · RBAC với Role, ClusterRole và ServiceAccount
# File sinh tự động từ src/labs/level6.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab23 --ignore-not-found --wait=false >/dev/null
kubectl delete clusterrole node-reader secret-admin-lab23 --ignore-not-found >/dev/null
kubectl delete clusterrolebinding ops-node-reader ci-secrets-admin --ignore-not-found >/dev/null
rm -f "$ANS/23-binding.txt"
