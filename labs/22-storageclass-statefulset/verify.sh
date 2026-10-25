#!/usr/bin/env bash
# Lab 22 · StorageClass, dynamic provisioning và StatefulSet
# File sinh tự động từ src/labs/level5.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 22 "StorageClass, dynamic provisioning và StatefulSet"
old=$(jp cm lab-state -n lab22 '{.data.old-default}'); prov=$(jp cm lab-state -n lab22 '{.data.provisioner}')
expect "fast dùng provisioner $prov" "$(jp sc fast '{.provisioner}')" "$prov"
expect "fast: Retain, WaitForFirstConsumer, cho mở rộng" "$(jp sc fast '{.reclaimPolicy}:{.volumeBindingMode}:{.allowVolumeExpansion}')" "Retain:WaitForFirstConsumer:true"
expect "fast là mặc định" "$(jp sc fast '{.metadata.annotations.storageclass\.kubernetes\.io/is-default-class}')" "true"
expect_match "$old không còn là mặc định" "$(jp sc "$old" '{.metadata.annotations.storageclass\.kubernetes\.io/is-default-class}')" '^(false)?$'
expect "22-phase.txt" "$(ans 22-phase.txt)" "Pending"
expect "PVC data dùng fast và Bound" "$(jp pvc data -n lab22 '{.spec.storageClassName}:{.status.phase}')" "fast:Bound"
expect "app Running" "$(jp pod app -n lab22 '{.status.phase}')" "Running"
expect "db là headless" "$(jp svc db -n lab22 '{.spec.clusterIP}')" "None"
expect "StatefulSet db 2/2 sẵn sàng" "$(jp sts db -n lab22 '{.status.readyReplicas}')" "2"
expect "data-db-0 và data-db-1 Bound, class fast" "$(jp pvc data-db-0 -n lab22 '{.status.phase}:{.spec.storageClassName}') $(jp pvc data-db-1 -n lab22 '{.status.phase}:{.spec.storageClassName}')" "Bound:fast Bound:fast"
end_verify
