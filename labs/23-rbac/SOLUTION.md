# Lời giải · Lab 23 · RBAC với Role, ClusterRole và ServiceAccount

```bash
kubectl create sa deployer -n lab23
kubectl create role deploy-manager -n lab23 --verb=get,list,watch,create,update,patch,delete --resource=deployments
# Role tạo bằng lệnh chỉ có một bộ verb; thêm rule cho pods bằng edit:
kubectl edit role deploy-manager -n lab23
```
```yaml
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
```
```bash
kubectl create rolebinding deployer-binding -n lab23 --role=deploy-manager --serviceaccount=lab23:deployer
kubectl create clusterrole node-reader --verb=get,list,watch --resource=nodes
kubectl create clusterrolebinding ops-node-reader --clusterrole=node-reader --group=ops-team
kubectl create role log-reader -n lab23 --verb=get,list --resource=pods,pods/log
kubectl create rolebinding jane-logs -n lab23 --role=log-reader --user=jane
kubectl create sa auditor -n lab23
kubectl create rolebinding auditor-view -n lab23 --clusterrole=view --serviceaccount=lab23:auditor

kubectl get rolebinding,clusterrolebinding -A -o wide | grep legacy-bot
echo ci-secrets-admin > ~/cka-answers/23-binding.txt
kubectl delete clusterrolebinding ci-secrets-admin

kubectl auth can-i delete secrets -n lab23 --as=system:serviceaccount:lab23:legacy-bot   # no
```
