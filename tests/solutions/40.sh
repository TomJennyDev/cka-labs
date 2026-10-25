#!/usr/bin/env bash
# Lab 40 · Cài CNI Calico bằng Tigera Operator
# File sinh tự động từ src/labs/level7-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
K="kubectl --context kind-cka-cni"
CIDR=$($K -n kube-system get cm kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' | awk '/podSubnet:/{print $2}')
echo "$CIDR" > "$ANS/40-pod-cidr.txt"
$K create -f https://raw.githubusercontent.com/projectcalico/calico/v3.33.0/manifests/operator-crds.yaml >/dev/null
$K create -f https://raw.githubusercontent.com/projectcalico/calico/v3.33.0/manifests/tigera-operator.yaml >/dev/null
$K wait --for=condition=Established crd/installations.operator.tigera.io --timeout=60s
cat <<EOF | $K create -f -
apiVersion: operator.tigera.io/v1
kind: Installation
metadata: {name: default}
spec:
  calicoNetwork:
    ipPools:
    - name: default-ipv4-ippool
      blockSize: 26
      cidr: $CIDR
      encapsulation: VXLANCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()
EOF
$K wait --for=condition=Ready node --all --timeout=600s
for _ in $(seq 1 60); do [ "$($K get tigerastatus calico -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' 2>/dev/null)" = True ] && break; sleep 5; done
