#!/usr/bin/env bash
# Lab 40 · Cài CNI Calico bằng Tigera Operator
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 40 "Cài CNI Calico bằng Tigera Operator"
K="kubectl --context kind-cka-cni"
if ! kubectl config get-contexts kind-cka-cni >/dev/null 2>&1; then bad "Có context kind-cka-cni" "chạy lại ./lab start 40"; end_verify; fi
cidr="$($K -n kube-system get cm kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' 2>/dev/null | awk '/podSubnet:/{print $2}')"
expect "40-pod-cidr.txt" "$(ans 40-pod-cidr.txt)" "${cidr:-<không đọc được kubeadm-config>}"
expect "Tigera Operator sẵn sàng" "$($K -n tigera-operator get deploy tigera-operator -o jsonpath='{.status.availableReplicas}' 2>/dev/null)" "1"
expect "Installation default có IP pool đúng Pod CIDR" "$($K get installation default -o jsonpath='{.spec.calicoNetwork.ipPools[0].cidr}' 2>/dev/null)" "$cidr"
expect "Encapsulation VXLANCrossSubnet" "$($K get installation default -o jsonpath='{.spec.calicoNetwork.ipPools[0].encapsulation}' 2>/dev/null)" "VXLANCrossSubnet"
expect "tigerastatus calico Available" "$($K get tigerastatus calico -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' 2>/dev/null)" "True"
expect "Cả 2 node Ready" "$($K get nodes --no-headers 2>/dev/null | awk '$2=="Ready"' | wc -l | tr -d ' ')" "2"
# pod-to-pod across nodes
$K delete pod lab40-srv lab40-cli --now --ignore-not-found >/dev/null 2>&1
$K run lab40-srv --image=nginx:1.27 --restart=Never >/dev/null 2>&1
$K wait --for=condition=Ready pod/lab40-srv --timeout=90s >/dev/null 2>&1
ip="$($K get pod lab40-srv -o jsonpath='{.status.podIP}' 2>/dev/null)"
$K run lab40-cli --image=busybox:1.36 --restart=Never --overrides='{"spec":{"tolerations":[{"operator":"Exists"}],"nodeSelector":{"node-role.kubernetes.io/control-plane":""}}}' --command -- sh -c "wget -qO- -T 5 http://$ip >/dev/null" >/dev/null 2>&1
for _ in $(seq 1 45); do ph="$($K get pod lab40-cli -o jsonpath='{.status.phase}' 2>/dev/null)"; case "$ph" in Succeeded|Failed) break;; esac; sleep 2; done
expect "Pod trên control plane gọi được Pod trên worker" "${ph:-}" "Succeeded"
$K delete pod lab40-srv lab40-cli --now --ignore-not-found >/dev/null 2>&1
end_verify
