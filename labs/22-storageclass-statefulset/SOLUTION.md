# Lời giải · Lab 22 · StorageClass, dynamic provisioning và StatefulSet

```bash
kubectl get sc        # standard (default)   rancher.io/local-path
```
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast
  annotations: {storageclass.kubernetes.io/is-default-class: "true"}
provisioner: rancher.io/local-path
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```
```bash
kubectl patch sc standard -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'
kubectl create -f pvc-data.yaml && kubectl get pvc data -n lab22   # Pending (chờ consumer)
echo Pending > ~/cka-answers/22-phase.txt
```
```yaml
apiVersion: v1
kind: Pod
metadata: {name: app, namespace: lab22}
spec:
  containers:
  - {name: c, image: busybox:1.36, command: ["sleep", "3600"], volumeMounts: [{name: d, mountPath: /data}]}
  volumes:
  - {name: d, persistentVolumeClaim: {claimName: data}}
---
apiVersion: v1
kind: Service
metadata: {name: db, namespace: lab22}
spec:
  clusterIP: None
  selector: {app: db}
  ports: [{port: 5432}]
---
apiVersion: apps/v1
kind: StatefulSet
metadata: {name: db, namespace: lab22}
spec:
  serviceName: db
  replicas: 2
  selector: {matchLabels: {app: db}}
  template:
    metadata: {labels: {app: db}}
    spec:
      containers:
      - name: db
        image: busybox:1.36
        command: ["sleep", "3600"]
        volumeMounts: [{name: data, mountPath: /var/lib/db}]
  volumeClaimTemplates:
  - metadata: {name: data}
    spec:
      accessModes: [ReadWriteOnce]
      storageClassName: fast
      resources: {requests: {storage: 1Gi}}
```
