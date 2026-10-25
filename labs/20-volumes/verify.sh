#!/usr/bin/env bash
# Lab 20 · Volume: emptyDir, hostPath, projected và Downward API
# File sinh tự động từ src/labs/level5.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 20 "Volume: emptyDir, hostPath, projected và Downward API"
expect "emptyDir data là tmpfs giới hạn 64Mi" "$(jp pod shared -n lab20 '{.spec.volumes[?(@.name=="data")].emptyDir.medium}:{.spec.volumes[?(@.name=="data")].emptyDir.sizeLimit}')" "Memory:64Mi"
expect "shared có 2 container writer, reader" "$(jp pod shared -n lab20 '{.spec.containers[*].name}')" "writer reader"
check "reader đọc được log writer ghi" bash -c "kubectl logs shared -n lab20 -c reader | grep -Eq '[0-9]{2}:[0-9]{2}:[0-9]{2}'"
expect "hostlog chạy trên $NODE1" "$(jp pod hostlog -n lab20 '{.spec.nodeName}')" "$NODE1"
expect "hostlog gắn hostPath /var/log/lab20" "$(jp pod hostlog -n lab20 '{.spec.volumes[0].hostPath.path}')" "/var/log/lab20"
check "File /var/log/lab20/hello.txt có trên $NODE1" bash -c "source '$LAB_ROOT/lib/common.sh'; node_exec '$NODE1' 'cat /var/log/lab20/hello.txt' | grep -q 'hello from pod'"
envs=$(kubectl exec info -n lab20 -- env 2>/dev/null)
expect "info có POD_IP đúng" "$(grep '^POD_IP=' <<<"$envs" | cut -d= -f2)" "$(jp pod info -n lab20 '{.status.podIP}')"
expect "info có NODE_NAME đúng" "$(grep '^NODE_NAME=' <<<"$envs" | cut -d= -f2)" "$(jp pod info -n lab20 '{.spec.nodeName}')"
files=$(kubectl exec info -n lab20 -- ls /etc/info 2>/dev/null | xargs)
expect "/etc/info có feature.flags, labels, token" "$(tr ' ' '\n' <<<"$files" | grep -E '^(feature.flags|labels|token)$' | sort | xargs)" "feature.flags labels token"
toks=$(jp pod info -n lab20 '{range .spec.volumes[*].projected.sources[*]}{.serviceAccountToken.path}:{.serviceAccountToken.expirationSeconds}{"\n"}{end}')
check "Token ServiceAccount ở file token, hạn 3600 giây" grep -qx 'token:3600' <<<"$toks"
end_verify
