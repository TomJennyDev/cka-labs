#!/usr/bin/env bash
# Lab 22 · StorageClass, dynamic provisioning và StatefulSet
# File sinh tự động từ src/labs/level5.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS/22-phase.txt"
ns_fresh lab22
kubectl delete sc fast --ignore-not-found >/dev/null
def=$(kubectl get sc -o jsonpath='{range .items[?(@.metadata.annotations.storageclass\.kubernetes\.io/is-default-class=="true")]}{.metadata.name}{end}')
[ -n "$def" ] || die "Cluster chưa có StorageClass mặc định."
kubectl create cm lab-state -n lab22 --from-literal=old-default="$def" --from-literal=provisioner="$(jp sc "$def" '{.provisioner}')" >/dev/null
kubectl get cm lab-state -n lab22 -o yaml > "$ANS/.22-state.yaml"
echo "StorageClass mặc định hiện tại: $def (provisioner $(jp sc "$def" '{.provisioner}'))"
echo "✔ Đã dựng xong tình huống."
