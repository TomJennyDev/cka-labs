# Lời giải · Lab 37 · Theo dõi tài nguyên, event và log

```bash
kubectl top pod -n lab37 --sort-by=cpu --no-headers | head -1 | awk '{print $1}' > ~/cka-answers/37-cpu.txt
kubectl logs crashy -n lab37 --previous | grep FATAL > ~/cka-answers/37-fatal.txt
kubectl get pod crashy -n lab37 -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}' > ~/cka-answers/37-exit.txt
kubectl logs multi -n lab37 -c proxy | grep -c 'upstream timeout' > ~/cka-answers/37-timeouts.txt
kubectl get events -n lab37 --field-selector involvedObject.name=crashy,type=Warning --sort-by=.lastTimestamp \
  -o jsonpath='{.items[-1:].reason}' > ~/cka-answers/37-event.txt     # BackOff
```
