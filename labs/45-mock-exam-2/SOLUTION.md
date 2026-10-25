# Lời giải · Lab 45 · Đề thi thử 2 - chế độ phòng thi (2 giờ, 16 câu)

```bash
eval "$(./lab env)"
# 1  (host CP)
kubectl create sa audit -n m2-ops
kubectl create clusterrole pv-viewer --verb=get,list,watch --resource=persistentvolumes,storageclasses
kubectl create clusterrolebinding pv-viewer --clusterrole=pv-viewer --serviceaccount=m2-ops:audit
# 2  (máy của bạn)
mkdir -p ~/cka-answers/m2-kust/overlays/prod
cat > ~/cka-answers/m2-kust/overlays/prod/kustomization.yaml <<'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources: [../../base]
namespace: m2-app
replicas: [{name: shop-ui, count: 2}]
images: [{name: nginx, newTag: "1.28"}]
EOF
kubectl apply -k ~/cka-answers/m2-kust/overlays/prod
# 3  (host NODE1)
kubectl explain widget.spec
kubectl apply -f - <<'EOF'
apiVersion: lab.example.com/v1
kind: Widget
metadata: {name: blue, namespace: m2-app}
spec: {size: 3, color: blue}
EOF
# 4  (host NODE2)
crictl ps --name beacon -q | cut -c1-13 > /root/45-beacon.txt
# 5  (host CP)
kubectl rollout history deploy m2-web -n m2-app
kubectl rollout undo deploy m2-web -n m2-app --to-revision=1
# 6  (host NODE1)
kubectl create deploy m2-agent -n m2-app --image=busybox:1.36 $do -- sleep 3600 > ds.yaml
# đổi kind thành DaemonSet, xóa replicas/strategy, thêm vào template.spec:
#   nodeSelector: {m2-agent: "true"}
#   tolerations: [{key: node-role.kubernetes.io/control-plane, operator: Exists, effect: NoSchedule}]
# 7  (host NODE2): requests = limits = cpu 100m, memory 64Mi; priorityClassName: m2-high
# 8  (host CP)
```
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: db-guard, namespace: m2-net}
spec:
  podSelector: {matchLabels: {app: db}}
  policyTypes: [Ingress]
  ingress:
  - from:
    - podSelector: {matchLabels: {role: api}}
    - namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: m2-mon}}
    ports: [{protocol: TCP, port: 80}]
---
# 9  (host NODE1)
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata: {name: m2-gw, namespace: m2-net}
spec:
  gatewayClassName: m2-gc
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    hostname: m2.local
    tls: {mode: Terminate, certificateRefs: [{name: m2-tls}]}
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: {name: m2-route, namespace: m2-net}
spec:
  parentRefs: [{name: m2-gw, sectionName: https}]
  hostnames: [m2.local]
  rules:
  - matches: [{path: {type: PathPrefix, value: /}}]
    filters:
    - type: RequestHeaderModifier
      requestHeaderModifier: {add: [{name: x-env, value: exam}]}
    backendRefs: [{name: m2-api, port: 80}]
---
# 10  (host NODE2)
apiVersion: v1
kind: Service
metadata: {name: m2-api, namespace: m2-net}
spec:
  selector: {app: m2-api}
  sessionAffinity: ClientIP
  ports: [{port: 80, targetPort: http}]
```
```bash
# 11  (host CP): PVC xin ReadWriteMany, PV chỉ có ReadWriteOnce
kubectl get pvc m2-data -n m2-store -o yaml > pvc.yaml   # đổi accessModes thành [ReadWriteOnce], xóa status
kubectl replace --force -f pvc.yaml
# 12  (host NODE1): StorageClass + PVC + Pod như lab 22
# 13  (host NODE2)
kubectl describe pod -n m2-app -l app=m2-shop | grep -A3 -E 'Warning|Error'
kubectl get cm m2-shop-cfg -n m2-app -o yaml          # key là "mode", Deployment đòi "MODE"
kubectl set image deploy/m2-shop -n m2-app nginx=nginx:1.27
kubectl patch deploy m2-shop -n m2-app --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/env/0/valueFrom/configMapKeyRef/key","value":"mode"}]'
# 14  (host CP): selector app=back-end → app=backend, targetPort 8080 → 80
kubectl patch svc m2-backend -n m2-net --type=json -p '[{"op":"replace","path":"/spec/selector","value":{"app":"backend"}},{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'
# 15  (host NODE1)
kubectl logs m2-logger -n m2-ops -c worker | grep 'level=error' > /root/45-errors.txt
# 16  (host CP)
kubectl top pod -n m2-ops --sort-by=memory --no-headers | head -1 | awk '{print $1}' > /root/45-top.txt
```
