# Lời giải · Lab 17 · NetworkPolicy theo mô hình mặc định chặn

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: default-deny, namespace: lab17}
spec:
  podSelector: {}
  policyTypes: [Ingress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: web-to-api, namespace: lab17}
spec:
  podSelector: {matchLabels: {app: api}}
  policyTypes: [Ingress]
  ingress:
  - from: [{podSelector: {matchLabels: {app: web}}}]
    ports: [{protocol: TCP, port: 80}]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: api-to-db, namespace: lab17}
spec:
  podSelector: {matchLabels: {app: db}}
  policyTypes: [Ingress]
  ingress:
  - from: [{podSelector: {matchLabels: {app: api}}}]
    ports: [{protocol: TCP, port: 80}]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: monitoring-to-api, namespace: lab17}
spec:
  podSelector: {matchLabels: {app: api}}
  policyTypes: [Ingress]
  ingress:
  - from: [{namespaceSelector: {matchLabels: {purpose: monitoring}}}]
    ports: [{protocol: TCP, port: 80}]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: api-egress, namespace: lab17}
spec:
  podSelector: {matchLabels: {app: api}}
  policyTypes: [Egress]
  egress:
  - to: [{podSelector: {matchLabels: {app: db}}}]
    ports: [{protocol: TCP, port: 80}]
  - to: [{namespaceSelector: {}, podSelector: {matchLabels: {k8s-app: kube-dns}}}]
    ports: [{protocol: UDP, port: 53}, {protocol: TCP, port: 53}]
```
Các policy cộng dồn: `api` nhận được từ `web` (policy 2) **hoặc** từ namespace monitoring (policy 4).
