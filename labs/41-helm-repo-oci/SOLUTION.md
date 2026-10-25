# Lời giải · Lab 41 · Helm với repo và OCI - Argo CD, sửa release lỗi

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
helm show values argo/argo-cd --version 10.11.1 | grep -A3 '^crds'
helm template argocd argo/argo-cd --version 10.11.1 -n argocd \
  --set crds.install=false > ~/cka-answers/41-argocd.yaml
grep -c 'kind: CustomResourceDefinition' ~/cka-answers/41-argocd.yaml     # 0

helm install podinfo oci://ghcr.io/stefanprodan/charts/podinfo --version 6.15.0 \
  -n lab41 --set replicaCount=2 --set ui.message=CKA --wait

helm list -n lab41 -a                 # shop: failed
helm history shop -n lab41            # revision 2 failed
helm get values shop -n lab41         # service.type: Bogus
helm upgrade shop podinfo --repo https://stefanprodan.github.io/podinfo --version 6.15.0 \
  -n lab41 --reuse-values --set service.type=ClusterIP --wait
```
