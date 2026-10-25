#!/usr/bin/env bash
# Lab 21 · PersistentVolume, PVC và reclaim policy
# File sinh tự động từ src/labs/level5.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 21 "PersistentVolume, PVC và reclaim policy"
expect "pv-log 1Gi RWO Retain manual" "$(jp pv pv-log '{.spec.capacity.storage}:{.spec.accessModes[0]}:{.spec.persistentVolumeReclaimPolicy}:{.spec.storageClassName}')" "1Gi:ReadWriteOnce:Retain:manual"
expect "pv-log dùng hostPath /mnt/lab21/log" "$(jp pv pv-log '{.spec.hostPath.path}')" "/mnt/lab21/log"
expect "log-claim Bound với pv-log" "$(jp pvc log-claim -n lab21 '{.status.phase}:{.spec.volumeName}')" "Bound:pv-log"
expect "logger Running" "$(jp pod logger -n lab21 '{.status.phase}')" "Running"
expect "/log/app.log có nội dung ok" "$(kubectl exec logger -n lab21 -- cat /log/app.log 2>/dev/null)" "ok"
expect "pv-old là PV cũ (không tạo lại)" "$(jp pv pv-old '{.metadata.uid}')" "$(jp cm lab-state -n lab21 '{.data.pv-old-uid}')"
expect "reuse Bound đích danh pv-old" "$(jp pvc reuse -n lab21 '{.status.phase}:{.spec.volumeName}')" "Bound:pv-old"
end_verify
