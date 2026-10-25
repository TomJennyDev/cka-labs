# Lời giải · Lab 05 · Deployment: scale, rolling update, rollback

```bash
kubectl scale deploy shop -n lab05 --replicas=4
kubectl patch deploy shop -n lab05 -p '{"spec":{"revisionHistoryLimit":5,"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}}}'

kubectl set image deploy/shop -n lab05 nginx=nginx:1.28
kubectl annotate deploy/shop -n lab05 kubernetes.io/change-cause='nang cap nginx 1.28' --overwrite
kubectl rollout status deploy/shop -n lab05

kubectl set image deploy/shop -n lab05 nginx=nginx:1.99
kubectl annotate deploy/shop -n lab05 kubernetes.io/change-cause='thu nginx 1.99' --overwrite
kubectl rollout status deploy/shop -n lab05 --timeout=30s     # kẹt
kubectl get pods -n lab05                                     # 1 Pod ImagePullBackOff, 4 Pod cũ vẫn chạy
kubectl rollout history deploy/shop -n lab05
kubectl rollout undo deploy/shop -n lab05                     # về revision trước (1.28)

kubectl patch deploy legacy -n lab05 -p '{"spec":{"strategy":{"type":"Recreate","rollingUpdate":null}}}'
```
