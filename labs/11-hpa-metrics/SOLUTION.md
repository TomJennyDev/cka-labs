# Lời giải · Lab 11 · metrics-server và HorizontalPodAutoscaler

```bash
kubectl top pod -n kube-system --sort-by=memory --no-headers | head -1 | awk '{print $1}' > ~/cka-answers/11-top-pod.txt
kubectl autoscale deploy web -n lab11 --min=2 --max=6 --cpu-percent=50 $do > hpa.yaml
```
Thêm vào `spec` của `hpa.yaml` rồi `kubectl apply -f hpa.yaml`:
```yaml
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 60
```
```bash
kubectl describe hpa api -n lab11        # failed to get cpu utilization: missing request for cpu
kubectl set resources deploy api -n lab11 --requests=cpu=100m
kubectl get hpa -n lab11                 # sau khoảng 1 phút TARGETS hiện %
```
