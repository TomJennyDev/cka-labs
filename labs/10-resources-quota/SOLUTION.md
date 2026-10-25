# Lời giải · Lab 10 · Requests, limits, LimitRange và ResourceQuota

```bash
kubectl describe rs -n lab10 -l app=heavy | grep FailedCreate
#   exceeded quota: team-quota, requested: requests.cpu=800m, used: requests.cpu=1600m, limited: requests.cpu=2
echo requests.cpu > ~/cka-answers/10-quota.txt
kubectl set resources deploy heavy -n lab10 --requests=cpu=200m,memory=128Mi --limits=memory=256Mi
```
```yaml
apiVersion: v1
kind: LimitRange
metadata: {name: defaults, namespace: lab10}
spec:
  limits:
  - type: Container
    defaultRequest: {cpu: 100m, memory: 64Mi}
    default: {cpu: 200m, memory: 128Mi}
```
```bash
kubectl run plain -n lab10 --image=nginx:1.27
kubectl get pod plain -n lab10 -o jsonpath='{.spec.containers[0].resources}'
kubectl run gold -n lab10 --image=nginx:1.27 $do > gold.yaml
# thêm resources: requests và limits đều cpu: 100m, memory: 64Mi
kubectl apply -f gold.yaml
kubectl get pod gold -n lab10 -o jsonpath='{.status.qosClass}'   # Guaranteed
```
