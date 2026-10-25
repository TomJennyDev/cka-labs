# Lời giải · Lab 25 · securityContext và Pod Security Admission

```bash
kubectl label ns lab25 pod-security.kubernetes.io/enforce=restricted pod-security.kubernetes.io/warn=restricted
kubectl edit deploy api -n lab25
```
```yaml
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        seccompProfile: {type: RuntimeDefault}
      containers:
      - name: busybox
        image: busybox:1.36
        command: ["sleep", "3600"]
        securityContext:
          allowPrivilegeEscalation: false
          capabilities: {drop: ["ALL"]}
```
```yaml
apiVersion: v1
kind: Pod
metadata: {name: secure, namespace: lab25}
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    seccompProfile: {type: RuntimeDefault}
  containers:
  - name: c
    image: busybox:1.36
    command: ["sleep", "3600"]
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities: {drop: ["ALL"]}
    volumeMounts: [{name: tmp, mountPath: /tmp}]
  volumes:
  - {name: tmp, emptyDir: {}}
```
```bash
kubectl exec secure -n lab25 -- touch /x        # Read-only file system
kubectl exec secure -n lab25 -- touch /tmp/x    # được
```
