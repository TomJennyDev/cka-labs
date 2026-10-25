# Lời giải · Lab 15 · Service, EndpointSlice và kết nối giữa các Pod

```bash
kubectl expose deploy web -n lab15 --port=80
kubectl get svc web -n lab15 -o jsonpath='{.spec.clusterIP}' > ~/cka-answers/15-web-ip.txt
kubectl expose deploy web -n lab15 --name=web-np --type=NodePort --port=80 $do > np.yaml
# thêm nodePort: 30080 dưới ports[0], rồi
kubectl apply -f np.yaml

kubectl get svc api-svc -n lab15 -o yaml       # selector app=apis, targetPort 8080
kubectl get pods -n lab15 --show-labels        # Pod có app=api, nginx nghe cổng 80
kubectl patch svc api-svc -n lab15 --type=json -p '[{"op":"replace","path":"/spec/selector","value":{"app":"api"}},{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'
kubectl get endpointslices -n lab15 -l kubernetes.io/service-name=api-svc

kubectl create svc clusterip db -n lab15 --clusterip=None --tcp=5432
# selector của Service tạo bằng lệnh trên là app=db, khớp label Pod của StatefulSet
```
```yaml
apiVersion: v1
kind: Service
metadata: {name: legacy-db, namespace: lab15}
spec:
  ports: [{port: 5432, protocol: TCP}]
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: legacy-db-1
  namespace: lab15
  labels: {kubernetes.io/service-name: legacy-db}
addressType: IPv4
ports: [{port: 5432, protocol: TCP}]
endpoints: [{addresses: ["10.0.5.20"]}]
```
