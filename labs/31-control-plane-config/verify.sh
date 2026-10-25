#!/usr/bin/env bash
# Lab 31 · Chứng chỉ, cấu hình control plane và kubelet
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 31 "Chứng chỉ, cấu hình control plane và kubelet"
expect "31-svc-range.txt" "$(ans 31-svc-range.txt)" "$(node_exec "$CP" "grep -o 'service-cluster-ip-range=[^ ]*' /etc/kubernetes/manifests/kube-apiserver.yaml | cut -d= -f2")"
want="$(node_exec "$NODE1" "awk '/^cgroupDriver:/{print \$2}' /var/lib/kubelet/config.yaml") $(node_exec "$NODE1" "awk '/^clusterDNS:/{getline; print \$2}' /var/lib/kubelet/config.yaml")"
expect "31-kubelet.txt" "$(xargs < "$ANS/31-kubelet.txt" 2>/dev/null)" "$(echo $want)"
now_fp=$(node_exec "$CP" 'sha256sum /etc/kubernetes/pki/apiserver.crt' | awk '{print $1}')
check "Chứng chỉ apiserver đã được gia hạn (file thay đổi)" test "$now_fp" != "$(node_exec "$CP" 'cat /root/lab31-crt.sha')"
srv=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' | sed 's#https://##')
served=$(echo | openssl s_client -connect "$srv" 2>/dev/null | openssl x509 -noout -fingerprint -sha256 2>/dev/null)
onfile=$(node_exec "$CP" 'cat /etc/kubernetes/pki/apiserver.crt' | openssl x509 -noout -fingerprint -sha256 2>/dev/null)
expect "kube-apiserver đang phục vụ chứng chỉ mới" "$served" "$onfile"
plugins=$(node_exec "$CP" "grep -o 'enable-admission-plugins=[^ ]*' /etc/kubernetes/manifests/kube-apiserver.yaml | cut -d= -f2")
check "Bật AlwaysPullImages" grep -q AlwaysPullImages <<<"$plugins"
check "Vẫn giữ NodeRestriction" grep -q NodeRestriction <<<"$plugins"
expect "kube-apiserver Running" "$(jp pod "kube-apiserver-$CP" -n kube-system '{.status.phase}')" "Running"
end_verify
