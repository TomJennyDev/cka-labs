# Lời giải · Lab 40 · Cài CNI Calico bằng Tigera Operator

```bash
K="kubectl --context kind-cka-cni"
$K get nodes                                           # NotReady
$K -n kube-system get cm kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' | grep podSubnet
CIDR=$($K -n kube-system get cm kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' | awk '/podSubnet:/{print $2}')
echo "$CIDR" > ~/cka-answers/40-pod-cidr.txt

$K create -f https://raw.githubusercontent.com/projectcalico/calico/v3.33.0/manifests/operator-crds.yaml
$K create -f https://raw.githubusercontent.com/projectcalico/calico/v3.33.0/manifests/tigera-operator.yaml
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
$K get tigerastatus -w            # chờ calico AVAILABLE True
$K wait --for=condition=Ready node --all --timeout=300s
```
