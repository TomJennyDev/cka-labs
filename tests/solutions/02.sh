#!/usr/bin/env bash
# Lab 02 · kubectl, namespace, context và Kubernetes API
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl create ns lab02
kubectl label ns lab02 team=blue
CL=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')
US=$(kubectl config view --minify -o jsonpath='{.users[0].name}')
kubectl config set-context lab02-ctx --cluster="$CL" --user="$US" --namespace=lab02
echo batch/v1 > "$ANS/02-cronjob-api.txt"
kubectl api-resources --namespaced=false --no-headers | wc -l > "$ANS/02-cluster-scoped.txt"
kubectl get pods -n lab02-apps -l tier=db -o jsonpath='{.items[0].metadata.name}' > "$ANS/02-db-pod.txt"
kubectl get pods -n lab02-apps -l tier=db -o jsonpath='{.items[0].spec.nodeName}' > "$ANS/02-db-node.txt"
