#!/usr/bin/env bash
# Lab 03 · Pod, label, log và exec
# File sinh tự động từ src/labs/level0-1.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 03 "Pod, label, log và exec"
expect "Pod web dùng nginx:1.27" "$(jp pod web -n lab03 '{.spec.containers[0].image}')" "nginx:1.27"
expect "Pod web có label app=web" "$(jp pod web -n lab03 '{.metadata.labels.app}')" "web"
expect "Pod web có label tier=front" "$(jp pod web -n lab03 '{.metadata.labels.tier}')" "front"
expect "Pod web khai báo containerPort 80" "$(jp pod web -n lab03 '{.spec.containers[0].ports[0].containerPort}')" "80"
expect "Pod worker có MODE=lab" "$(jp pod worker -n lab03 '{.spec.containers[0].env[?(@.name=="MODE")].value}')" "lab"
expect_match "Pod worker chạy lệnh đúng" "$(jp pod worker -n lab03 '{.spec.containers[0].command} {.spec.containers[0].args}')" "echo started; sleep 3600"
expect "03-errors.txt có đúng 3 dòng ERROR" "$(grep -c ERROR "$ANS/03-errors.txt" 2>/dev/null)/$(wc -l < "$ANS/03-errors.txt" 2>/dev/null | tr -d ' ')" "3/3"
expect "Pod broken dùng nginx:1.27" "$(jp pod broken -n lab03 '{.spec.containers[0].image}')" "nginx:1.27"
expect "Pod broken Running" "$(jp pod broken -n lab03 '{.status.phase}')" "Running"
expect "Pod broken là Pod cũ (không xóa rồi tạo lại)" "$(jp pod broken -n lab03 '{.metadata.uid}')" "$(jp cm lab-state -n lab03 '{.data.broken-uid}')"
expect "03-hostname.txt" "$(tr -d '[:space:]' < "$ANS/03-hostname.txt" 2>/dev/null)" "web"
check "Pod old đã bị xóa" bash -c '! kubectl get pod old -n lab03 >/dev/null 2>&1'
end_verify
