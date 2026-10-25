# Lời giải · Lab 02 · kubectl, namespace, context và Kubernetes API

```bash
kubectl create ns lab02
kubectl label ns lab02 team=blue

CL=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')
US=$(kubectl config view --minify -o jsonpath='{.users[0].name}')
kubectl config set-context lab02-ctx --cluster="$CL" --user="$US" --namespace=lab02

kubectl api-resources | grep -i cronjob          # cronjobs  cj  batch/v1  true  CronJob
echo batch/v1 > ~/cka-answers/02-cronjob-api.txt

kubectl api-resources --namespaced=false --no-headers | wc -l > ~/cka-answers/02-cluster-scoped.txt

kubectl get pods -n lab02-apps -l tier=db -o wide
kubectl get pods -n lab02-apps -l tier=db -o jsonpath='{.items[0].metadata.name}' > ~/cka-answers/02-db-pod.txt
kubectl get pods -n lab02-apps -l tier=db -o jsonpath='{.items[0].spec.nodeName}' > ~/cka-answers/02-db-node.txt
```
