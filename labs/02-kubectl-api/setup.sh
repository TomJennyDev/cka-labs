#!/usr/bin/env bash
# Lab 02 · kubectl, namespace, context và Kubernetes API
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir
rm -f "$ANS"/02-*.txt
kubectl delete ns lab02 --ignore-not-found >/dev/null
kubectl config delete-context lab02-ctx >/dev/null 2>&1 || true
ns_fresh lab02-apps
for p in web:front api:back cache:back; do
  kubectl run "${p%%:*}-$RANDOM" -n lab02-apps --image=nginx:1.27 --labels="tier=${p##*:}" >/dev/null
done
kubectl run "pg-$RANDOM" -n lab02-apps --image=busybox:1.36 --labels=tier=db --command -- sleep 3600 >/dev/null
kubectl wait --for=condition=Ready pod --all -n lab02-apps --timeout=120s >/dev/null
echo "✔ Đã dựng xong tình huống."
