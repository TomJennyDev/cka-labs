#!/usr/bin/env bash
# Lab 39 · Chuẩn bị node - container runtime, kernel và CRI
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env kind
detect_nodes
answers_dir; rm -f "$ANS"/39-*.txt
node_exec "$NODE1" 'command -v dpkg-deb >/dev/null && command -v systemctl >/dev/null' || die "Node $NODE1 cần dpkg và systemd (node kind hoặc máy ảo Debian/Ubuntu)"
node_exec "$NODE1" "$(cat <<'NODE'
set -e
systemctl disable --now cri-docker.service cri-docker.socket >/dev/null 2>&1 || true
dpkg --purge cri-dockerd >/dev/null 2>&1 || true
rm -f /etc/modules-load.d/k8s.conf /etc/sysctl.d/k8s.conf
sysctl -qw net.ipv6.conf.all.forwarding=0 2>/dev/null || true
[ -f /root/lab39-crictl.yaml.orig ] || { if [ -f /etc/crictl.yaml ]; then cp /etc/crictl.yaml /root/lab39-crictl.yaml.orig; else echo none > /root/lab39-crictl.yaml.orig; fi; }
printf 'runtime-endpoint: unix:///run/cri-dockerd.sock\nimage-endpoint: unix:///run/cri-dockerd.sock\ntimeout: 2\n' > /etc/crictl.yaml
A=$(dpkg --print-architecture); D=$(mktemp -d)
mkdir -p "$D/DEBIAN" "$D/usr/bin" "$D/usr/lib/systemd/system" /root/pkgs; chmod 755 "$D"
cat > "$D/DEBIAN/control" <<EOF
Package: cri-dockerd
Version: 0.4.9-lab
Architecture: $A
Maintainer: CKA Labs <labs@example.invalid>
Description: Goi mo phong cri-dockerd cho bai lab (khong phai ban that)
EOF
printf '#!/bin/sh\n# cri-dockerd mo phong cho bai lab\necho "cri-dockerd (lab) $*"\nexec sleep infinity\n' > "$D/usr/bin/cri-dockerd"
chmod 755 "$D/usr/bin/cri-dockerd"
cat > "$D/usr/lib/systemd/system/cri-docker.service" <<'EOF'
[Unit]
Description=CRI Interface for Docker Application Container Engine (lab)
Requires=cri-docker.socket
After=network-online.target cri-docker.socket
[Service]
ExecStart=/usr/bin/cri-dockerd --container-runtime-endpoint fd://
Restart=always
[Install]
WantedBy=multi-user.target
EOF
cat > "$D/usr/lib/systemd/system/cri-docker.socket" <<'EOF'
[Unit]
Description=CRI Docker Socket for the API (lab)
PartOf=cri-docker.service
[Socket]
ListenStream=%t/cri-dockerd.sock
SocketMode=0660
[Install]
WantedBy=sockets.target
EOF
rm -f /root/pkgs/cri-dockerd_*.deb
dpkg-deb --build --root-owner-group "$D" "/root/pkgs/cri-dockerd_0.4.9-lab_$A.deb" >/dev/null
rm -rf "$D"
NODE
)" || die "Không chuẩn bị được $NODE1"
echo "✔ Đã dựng xong tình huống."
