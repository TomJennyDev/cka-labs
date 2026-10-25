#!/usr/bin/env bash
# Lab 24 · User mới bằng chứng chỉ, CSR và kubeconfig
# File sinh tự động từ src/labs/level6.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
cd "$ANS"
openssl genrsa -out dev1.key 2048 2>/dev/null
openssl req -new -key dev1.key -subj "/CN=dev1/O=developers" -out dev1.csr
cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata: {name: dev1}
spec:
  request: $(base64 -w0 < dev1.csr)
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400
  usages: [client auth]
EOF
kubectl certificate approve dev1
for i in $(seq 1 20); do [ -n "$(kubectl get csr dev1 -o jsonpath='{.status.certificate}')" ] && break; sleep 1; done
kubectl get csr dev1 -o jsonpath='{.status.certificate}' | base64 -d > dev1.crt
SERVER=$(kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.server}')
kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 -d > ca.crt
K="--kubeconfig=dev1.kubeconfig"
kubectl config set-cluster lab $K --server="$SERVER" --certificate-authority=ca.crt --embed-certs
kubectl config set-credentials dev1 $K --client-certificate=dev1.crt --client-key=dev1.key --embed-certs
kubectl config set-context dev1@lab $K --cluster=lab --user=dev1 --namespace=lab24
kubectl config use-context dev1@lab $K
kubectl create role dev -n lab24 --verb=get,list,watch,create,delete --resource=pods,deployments
kubectl create rolebinding developers -n lab24 --role=dev --group=developers
kubectl $K create deploy hello --image=nginx:1.27
