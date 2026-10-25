# Lời giải · Lab 43 · Service LoadBalancer với MetalLB

```bash
kubectl expose deploy web -n lab43 --name=web-lb --type=LoadBalancer --port=80
kubectl get svc web-lb -n lab43                  # EXTERNAL-IP <pending>

kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.16.1/config/manifests/metallb-native.yaml
kubectl -n metallb-system wait --for=condition=Available deploy/controller --timeout=300s
kubectl -n metallb-system rollout status ds/speaker --timeout=300s
kubectl get cm lab-state -n lab43 -o yaml        # pool, last
```
```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata: {name: lab-pool, namespace: metallb-system}
spec:
  addresses: ["172.18.0.200-172.18.0.210"]     # giá trị pool của bạn
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata: {name: lab-l2, namespace: metallb-system}
spec:
  ipAddressPools: [lab-pool]
---
apiVersion: v1
kind: Service
metadata:
  name: web-fixed
  namespace: lab43
  annotations: {metallb.io/loadBalancerIPs: "172.18.0.210"}   # giá trị last
spec:
  type: LoadBalancer
  selector: {app: web}
  ports: [{port: 80, targetPort: 80}]
```
```bash
kubectl patch svc web-lb -n lab43 -p '{"spec":{"externalTrafficPolicy":"Local"}}'
kubectl get svc -n lab43
kubectl get svc web-lb -n lab43 -o jsonpath='{.spec.ports[0].nodePort}' > ~/cka-answers/43-nodeport.txt
kubectl run t -n lab43 --rm -it --image=busybox:1.36 --restart=Never -- wget -qO- -T3 http://172.18.0.210
```
