# Lời giải · Lab 03 · Pod, label, log và exec

```bash
kubectl run web -n lab03 --image=nginx:1.27 --labels=app=web,tier=front --port=80
kubectl run worker -n lab03 --image=busybox:1.36 --env=MODE=lab --command -- sh -c 'echo started; sleep 3600'
kubectl logs noisy -n lab03 | grep ERROR > ~/cka-answers/03-errors.txt
kubectl get pod broken -n lab03 -o jsonpath='{.spec.containers[*].name}'   # app
kubectl set image pod/broken -n lab03 app=nginx:1.27
kubectl exec web -n lab03 -- hostname > ~/cka-answers/03-hostname.txt
kubectl delete pod old -n lab03 --force --grace-period 0
```
