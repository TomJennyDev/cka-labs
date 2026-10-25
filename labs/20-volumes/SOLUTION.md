# Lời giải · Lab 20 · Volume: emptyDir, hostPath, projected và Downward API

```yaml
apiVersion: v1
kind: Pod
metadata: {name: shared, namespace: lab20}
spec:
  volumes:
  - name: data
    emptyDir: {medium: Memory, sizeLimit: 64Mi}
  containers:
  - name: writer
    image: busybox:1.36
    command: ["sh", "-c", "while true; do date >> /data/out.log; sleep 2; done"]
    volumeMounts: [{name: data, mountPath: /data}]
  - name: reader
    image: busybox:1.36
    command: ["sh", "-c", "tail -F /data/out.log"]
    volumeMounts: [{name: data, mountPath: /data}]
---
apiVersion: v1
kind: Pod
metadata: {name: hostlog, namespace: lab20}
spec:
  nodeSelector: {kubernetes.io/hostname: <NODE1>}
  volumes:
  - name: logs
    hostPath: {path: /var/log/lab20, type: DirectoryOrCreate}
  containers:
  - name: c
    image: busybox:1.36
    command: ["sh", "-c", "echo 'hello from pod' > /logs/hello.txt; sleep 3600"]
    volumeMounts: [{name: logs, mountPath: /logs}]
---
apiVersion: v1
kind: Pod
metadata: {name: info, namespace: lab20, labels: {app: info, tier: demo}}
spec:
  containers:
  - name: c
    image: busybox:1.36
    command: ["sleep", "3600"]
    env:
    - name: POD_IP
      valueFrom: {fieldRef: {fieldPath: status.podIP}}
    - name: NODE_NAME
      valueFrom: {fieldRef: {fieldPath: spec.nodeName}}
    volumeMounts: [{name: info, mountPath: /etc/info}]
  volumes:
  - name: info
    projected:
      sources:
      - configMap: {name: app-cfg}
      - downwardAPI:
          items: [{path: labels, fieldRef: {fieldPath: metadata.labels}}]
      - serviceAccountToken: {path: token, expirationSeconds: 3600}
```
```bash
kubectl logs shared -n lab20 -c reader
./lab ssh $NODE1      # cat /var/log/lab20/hello.txt
kubectl exec info -n lab20 -- sh -c 'env | grep -E "POD_IP|NODE_NAME"; ls /etc/info'
```
