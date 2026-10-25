# Lời giải · Lab 26 · Helm từ chart đến rollback

```bash
mkdir -p ~/cka-answers/lab26 && cd ~/cka-answers/lab26
helm create webapp
helm install web ./webapp -n lab26 --set replicaCount=2,image.tag=1.27
helm upgrade web ./webapp -n lab26 --reuse-values --set service.type=NodePort
helm upgrade web ./webapp -n lab26 --reuse-values --set image.tag=1.99
kubectl get pods -n lab26                       # ImagePullBackOff
helm history web -n lab26
helm rollback web 2 -n lab26
helm template preview ./webapp --set replicaCount=3 > ~/cka-answers/26-rendered.yaml
helm install tmp ./webapp -n lab26
helm uninstall tmp -n lab26
helm list -n lab26
```
