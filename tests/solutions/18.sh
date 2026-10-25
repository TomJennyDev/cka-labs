#!/usr/bin/env bash
# Lab 18 · Ingress, IngressClass và TLS
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
cd /tmp
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout tls.key -out tls.crt -subj "/CN=shop.lab.local" 2>/dev/null
kubectl create secret tls shop-tls -n lab18 --cert=tls.crt --key=tls.key
kubectl create ingress shop -n lab18 --class=lab-ingress --rule="shop.lab.local/api*=api:8080,tls=shop-tls" --rule="shop.lab.local/*=web:80,tls=shop-tls"
kubectl create ingress docs -n lab18 --rule="docs.lab.local/guide=web:80"
kubectl annotate ingressclass lab-ingress ingressclass.kubernetes.io/is-default-class=true --overwrite
