#!/usr/bin/env bash
# Lab 21 · PersistentVolume, PVC và reclaim policy
# File sinh tự động từ src/labs/level5.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
kubectl delete ns lab21 lab21-old --ignore-not-found --wait=true >/dev/null 2>&1
kubectl delete pv pv-log pv-old --ignore-not-found >/dev/null
