# Lời giải · Lab 08 · Init container và sidecar container

```yaml
apiVersion: v1
kind: Pod
metadata: {name: web, namespace: lab08}
spec:
  initContainers:
  - name: wait-db
    image: busybox:1.36
    command: ["sh", "-c", "until nslookup db.lab08.svc.cluster.local; do echo waiting; sleep 2; done"]
  containers:
  - {name: web, image: nginx:1.27}
```
```bash
kubectl get pod web -n lab08          # Init:0/1
kubectl create svc clusterip db -n lab08 --tcp=5432
kubectl get pod web -n lab08 -w       # → Running
kubectl get pod legacy -n lab08 -o yaml > legacy.yaml
```
Thêm vào `spec` của `legacy.yaml`:
```yaml
  initContainers:
  - name: log-tail
    image: busybox:1.36
    restartPolicy: Always
    command: ["sh", "-c", "tail -n+1 -F /var/log/app/app.log"]
    volumeMounts:
    - {name: logs, mountPath: /var/log/app}
```
```bash
kubectl replace --force -f legacy.yaml
kubectl logs legacy -n lab08 -c log-tail
```
