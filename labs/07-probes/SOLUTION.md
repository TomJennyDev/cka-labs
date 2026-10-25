# Lời giải · Lab 07 · Liveness, readiness và startup probe

`kubectl describe pod` cho thấy event `Liveness probe failed … connection refused` và `Killing`: liveness giết app trước khi nó kịp khởi động.
```bash
echo liveness > ~/cka-answers/07-culprit.txt
kubectl edit deploy slow-api -n lab07
```
```yaml
        startupProbe:
          httpGet: {path: /healthz, port: 8080}
          periodSeconds: 5
          failureThreshold: 12        # 60 giây
        livenessProbe:                # giữ nguyên
          httpGet: {path: /healthz, port: 8080}
          periodSeconds: 5
          failureThreshold: 2
        readinessProbe:
          httpGet: {path: /ready, port: 8080}   # trước đây là 8081
          periodSeconds: 5
```
```bash
kubectl patch deploy cache -n lab07 --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/0/readinessProbe","value":{"exec":{"command":["cat","/tmp/ready"]},"periodSeconds":5}}]'
kubectl rollout status deploy/slow-api -n lab07 --timeout=180s
kubectl get pods -n lab07
```
