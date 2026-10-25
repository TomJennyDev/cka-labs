#!/usr/bin/env bash
# Lab 39 · Chuẩn bị node - container runtime, kernel và CRI
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
node_exec "$NODE1" "$(cat <<'NODE'
systemctl disable --now cri-docker.service cri-docker.socket >/dev/null 2>&1
dpkg --purge cri-dockerd >/dev/null 2>&1
systemctl daemon-reload >/dev/null 2>&1
rm -rf /root/pkgs /etc/modules-load.d/k8s.conf /etc/sysctl.d/k8s.conf
if [ -f /root/lab39-crictl.yaml.orig ]; then
  if [ "$(cat /root/lab39-crictl.yaml.orig)" = none ]; then rm -f /etc/crictl.yaml; else cp /root/lab39-crictl.yaml.orig /etc/crictl.yaml; fi
  rm -f /root/lab39-crictl.yaml.orig
fi
true
NODE
)" >/dev/null 2>&1
rm -f "$ANS"/39-*.txt
