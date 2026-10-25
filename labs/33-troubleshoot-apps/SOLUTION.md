# Lời giải · Lab 33 · Troubleshooting ứng dụng: sáu Deployment hỏng

```bash
kubectl get pods -n lab33
# img: ImagePullBackOff
kubectl set image deploy/img -n lab33 nginx=nginx:1.27
# cmd: StartError, "slep": executable file not found
kubectl patch deploy cmd -n lab33 --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/command","value":["sleep","3600"]}]'
# oom: OOMKilled, exit 137
kubectl get pod -n lab33 -l app=oom -o jsonpath='{.items[0].status.containerStatuses[0].lastState.terminated.reason}' > ~/cka-answers/33-oom.txt
kubectl set resources deploy oom -n lab33 --limits=memory=256Mi
# pending: nodeSelector disktype=nvme không node nào có
kubectl patch deploy pending -n lab33 --type=json -p '[{"op":"remove","path":"/spec/template/spec/nodeSelector"}]'
# cfg: CreateContainerConfigError, configmap "app-settings" not found
kubectl create cm app-settings -n lab33 --from-literal=MODE=prod
# notready: Readiness probe failed: HTTP probe failed with statuscode: 404
kubectl patch deploy notready -n lab33 --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/"}]'
kubectl get deploy -n lab33
```
Pod của `cfg` tự chạy lại khi ConfigMap xuất hiện (kubelet thử lại). Nếu chậm: `kubectl rollout restart deploy cfg -n lab33`.
