# Lời giải · Lab 34 · Troubleshooting mạng: Service, NetworkPolicy và DNS

Có 4 lỗi chồng nhau:
```bash
# 1. DNS: CoreDNS bị scale về 0
kubectl -n kube-system get deploy coredns           # 0/0
kubectl -n kube-system scale deploy coredns --replicas=2   # (k3s: 1)
# 2. Service web chọn sai label
kubectl get svc web -n lab34 -o jsonpath='{.spec.selector}'   # app=wbe
# 3. targetPort sai (8080, nginx nghe 80)
kubectl patch svc web -n lab34 --type=json -p '[{"op":"replace","path":"/spec/selector","value":{"app":"web"}},{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'
# 4. Policy allow-frontend chọn sai label nguồn (role=front-end)
kubectl get netpol allow-frontend -n lab34 -o yaml
kubectl patch netpol allow-frontend -n lab34 --type=json -p '[{"op":"replace","path":"/spec/ingress/0/from/0/podSelector/matchLabels","value":{"role":"frontend"}}]'
kubectl exec client -n lab34 -- wget -qO- -T3 http://web.lab34
echo 4 > ~/cka-answers/34-faults.txt
```
