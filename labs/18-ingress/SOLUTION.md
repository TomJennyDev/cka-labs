# Lời giải · Lab 18 · Ingress, IngressClass và TLS

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout tls.key -out tls.crt -subj "/CN=shop.lab.local"
kubectl create secret tls shop-tls -n lab18 --cert=tls.crt --key=tls.key
kubectl create ingress shop -n lab18 --class=lab-ingress \
  --rule="shop.lab.local/api*=api:8080,tls=shop-tls" \
  --rule="shop.lab.local/*=web:80,tls=shop-tls"
kubectl create ingress docs -n lab18 --rule="docs.lab.local/guide=web:80"
kubectl annotate ingressclass lab-ingress ingressclass.kubernetes.io/is-default-class=true
kubectl describe ingress shop -n lab18
```
