# Lời giải · Lab 27 · Kustomize với base và overlay

```yaml
# ~/cka-answers/lab27/overlays/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources: [../../base]
namespace: lab27
namePrefix: prod-
labels:
- pairs: {env: prod}
  includeSelectors: true
replicas:
- {name: web, count: 3}
images:
- {name: nginx, newTag: "1.28"}
configMapGenerator:
- name: app-config
  behavior: merge
  literals: [MODE=prod]
patches:
- path: resources.yaml
---
# ~/cka-answers/lab27/overlays/prod/resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata: {name: web}
spec:
  template:
    spec:
      containers:
      - name: web
        resources:
          requests: {cpu: 100m}
```
```bash
kubectl kustomize ~/cka-answers/lab27/overlays/prod > ~/cka-answers/27-rendered.yaml
kubectl apply -k ~/cka-answers/lab27/overlays/prod
kubectl get deploy,svc,cm -n lab27
```
