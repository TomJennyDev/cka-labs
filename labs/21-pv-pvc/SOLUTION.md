# Lời giải · Lab 21 · PersistentVolume, PVC và reclaim policy

```yaml
apiVersion: v1
kind: PersistentVolume
metadata: {name: pv-log}
spec:
  capacity: {storage: 1Gi}
  accessModes: [ReadWriteOnce]
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath: {path: /mnt/lab21/log, type: DirectoryOrCreate}
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: log-claim, namespace: lab21}
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: manual
  resources: {requests: {storage: 500Mi}}
---
apiVersion: v1
kind: Pod
metadata: {name: logger, namespace: lab21}
spec:
  containers:
  - name: c
    image: busybox:1.36
    command: ["sh", "-c", "echo ok > /log/app.log; sleep 3600"]
    volumeMounts: [{name: log, mountPath: /log}]
  volumes:
  - name: log
    persistentVolumeClaim: {claimName: log-claim}
```
```bash
kubectl get pv pv-old                     # STATUS Released, CLAIM lab21-old/data
kubectl patch pv pv-old --type=json -p '[{"op":"remove","path":"/spec/claimRef"}]'
kubectl get pv pv-old                     # Available
```
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: reuse, namespace: lab21}
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: manual-old
  volumeName: pv-old
  resources: {requests: {storage: 1Gi}}
```
