# Lời giải · Lab 42 · Cài và dùng một Operator thật - cert-manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.21.3/cert-manager.yaml
kubectl -n cert-manager wait --for=condition=Available deploy --all --timeout=300s

kubectl get crd -o name | grep 'cert-manager.io' | cut -d/ -f2 | sort > ~/cka-answers/42-crds.txt
kubectl explain certificate.spec.subject > ~/cka-answers/42-subject.txt
```
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata: {name: selfsigned}
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata: {name: web-cert, namespace: lab42}
spec:
  secretName: web-tls
  dnsNames: [web.lab42.svc]
  issuerRef: {name: selfsigned, kind: ClusterIssuer}
```
```bash
kubectl wait --for=condition=Ready certificate/web-cert -n lab42 --timeout=120s
kubectl get secret web-tls -n lab42      # TYPE kubernetes.io/tls
```
