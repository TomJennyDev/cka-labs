#!/usr/bin/env bash
# Lab 22 · StorageClass, dynamic provisioning và StatefulSet
# File sinh tự động từ src/labs/level5.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
old=$(jp cm lab-state -n lab22 '{.data.old-default}')
[ -z "$old" ] && [ -f "$ANS/.22-state.yaml" ] && old=$(grep 'old-default:' "$ANS/.22-state.yaml" | awk '{print $2}')
kubectl delete ns lab22 --ignore-not-found --wait=true >/dev/null 2>&1
for pv in $(kubectl get pv -o jsonpath='{range .items[?(@.spec.claimRef.namespace=="lab22")]}{.metadata.name}{" "}{end}'); do kubectl delete pv "$pv" --wait=false >/dev/null 2>&1; done
kubectl delete sc fast --ignore-not-found >/dev/null
[ -n "$old" ] && kubectl patch sc "$old" -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}' >/dev/null 2>&1
rm -f "$ANS/22-phase.txt" "$ANS/.22-state.yaml"
