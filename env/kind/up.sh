#!/usr/bin/env bash
# Dựng cluster lab bằng kind (cần Docker, kind >= v0.33, kubectl)
set -euo pipefail
cd "$(dirname "$0")"
for t in docker kind kubectl; do command -v "$t" >/dev/null || { echo "Thiếu $t. Xem env/README.md"; exit 1; }; done
if kind get clusters 2>/dev/null | grep -qx cka; then
  echo "Cluster 'cka' đã có. Xóa bằng env/kind/down.sh nếu muốn dựng lại."
else
  kind create cluster --config cluster.yaml --wait 120s
fi
kubectl config use-context kind-cka >/dev/null
echo "› Cài metrics-server (cho kubectl top và HPA)"
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.8.1/components.yaml >/dev/null
kubectl -n kube-system patch deploy metrics-server --type=json \
  -p '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]' >/dev/null 2>&1 || true
kubectl get nodes -o wide
echo
echo "Xong. Tiếp theo: ./lab start 0"
