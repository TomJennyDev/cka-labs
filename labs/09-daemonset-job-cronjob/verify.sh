#!/usr/bin/env bash
# Lab 09 · DaemonSet, Job và CronJob
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 09 "DaemonSet, Job và CronJob"
nodes=$(kubectl get nodes --no-headers 2>/dev/null | wc -l | tr -d ' ')
expect "node-agent chạy trên mọi node ($nodes)" "$(jp ds node-agent -n lab09 '{.status.desiredNumberScheduled}')/$(jp ds node-agent -n lab09 '{.status.numberReady}')" "$nodes/$nodes"
expect "batch-sum completions=4 parallelism=2" "$(jp job batch-sum -n lab09 '{.spec.completions}/{.spec.parallelism}')" "4/2"
expect "batch-sum backoffLimit=2 ttl=300" "$(jp job batch-sum -n lab09 '{.spec.backoffLimit}/{.spec.ttlSecondsAfterFinished}')" "2/300"
expect "batch-sum hoàn thành 4 lần" "$(jp job batch-sum -n lab09 '{.status.succeeded}')" "4"
expect "report chạy mỗi 15 phút" "$(jp cronjob report -n lab09 '{.spec.schedule}')" "*/15 * * * *"
expect "report concurrencyPolicy Forbid" "$(jp cronjob report -n lab09 '{.spec.concurrencyPolicy}')" "Forbid"
expect "report giữ 2 job thành công" "$(jp cronjob report -n lab09 '{.spec.successfulJobsHistoryLimit}')" "2"
expect "report-now tạo từ CronJob report" "$(jp job report-now -n lab09 '{.metadata.annotations.cronjob\.kubernetes\.io/instantiate}')" "manual"
expect "report-now hoàn thành" "$(jp job report-now -n lab09 '{.status.succeeded}')" "1"
end_verify
