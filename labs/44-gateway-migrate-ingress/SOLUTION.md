# Lời giải · Lab 44 · Gateway API với controller thật - HTTPS và chuyển từ Ingress

```bash
kubectl get ingress shop -n lab44 -o yaml
```
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata: {name: shop-gw, namespace: lab44}
spec:
  gatewayClassName: nginx
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    hostname: shop.lab44.local
  - name: https
    protocol: HTTPS
    port: 443
    hostname: shop.lab44.local
    tls:
      mode: Terminate
      certificateRefs: [{kind: Secret, name: shop-tls}]
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: {name: shop, namespace: lab44}
spec:
  parentRefs: [{name: shop-gw, sectionName: https}]
  hostnames: [shop.lab44.local]
  rules:
  - matches: [{path: {type: PathPrefix, value: /api}}]
    backendRefs: [{name: api, port: 8080}]
  - matches: [{path: {type: PathPrefix, value: /}}]
    backendRefs: [{name: web, port: 80}]
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: {name: shop-redirect, namespace: lab44}
spec:
  parentRefs: [{name: shop-gw, sectionName: http}]
  hostnames: [shop.lab44.local]
  rules:
  - filters:
    - type: RequestRedirect
      requestRedirect: {scheme: https, statusCode: 301}
```
```bash
kubectl wait --for=condition=Programmed gateway/shop-gw -n lab44 --timeout=120s
IP=$(kubectl get svc -n lab44 -l gateway.networking.k8s.io/gateway-name=shop-gw -o jsonpath='{.items[0].spec.clusterIP}')
kubectl run t -n lab44 --rm -it --restart=Never --image=curlimages/curl:8.11.1 -- \
  sh -c "curl -sk --resolve shop.lab44.local:443:$IP https://shop.lab44.local/; curl -sk --resolve shop.lab44.local:443:$IP https://shop.lab44.local/api/health; curl -s -o /dev/null -w '%{http_code}\n' --resolve shop.lab44.local:80:$IP http://shop.lab44.local/"
kubectl delete ingress shop -n lab44
```
