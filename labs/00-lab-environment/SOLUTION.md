# Lời giải · Lab 00 · Dựng cluster lab và làm quen công cụ

```bash
./env/kind/up.sh
cat >> ~/.bashrc <<'EOF'
alias k=kubectl
source <(kubectl completion bash)
complete -o default -F __start_kubectl k
export do="--dry-run=client -o yaml"
export now="--force --grace-period 0"
EOF
source ~/.bashrc
eval "$(./lab env)"
mkdir -p ~/cka-answers
echo "$CP" > ~/cka-answers/00-cp.txt
kubectl get node "$NODE1" -o jsonpath='{.status.nodeInfo.kubeletVersion}' > ~/cka-answers/00-kubelet.txt
./lab ssh "$NODE1"     # rồi: crictl ps ; exit
```
