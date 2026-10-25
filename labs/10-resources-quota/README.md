# Lab 10 · Requests, limits, LimitRange và ResourceQuota

**Cấp độ 2 · Workloads** · khoảng 35 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Workloads & Scheduling › Admission và scheduling của Pod; Troubleshooting › Theo dõi tài nguyên cluster và ứng dụng

## Mục tiêu

Hiểu requests/limits tác động thế nào tới scheduling và QoS, tìm vì sao Deployment không đủ Pod khi namespace có quota, và đặt giá trị mặc định bằng LimitRange.

## Kiến thức cần nắm

- Scheduler chỉ nhìn **requests**. Vượt memory **limit** thì container bị OOMKilled; vượt CPU limit thì bị throttle.
- QoS: `Guaranteed` (mọi container có requests = limits cho CPU và memory), `Burstable`, `BestEffort` (không đặt gì, bị evict đầu tiên).
- ResourceQuota giới hạn tổng của namespace. Khi quota có `requests.cpu`, mọi Pod **bắt buộc** khai báo requests CPU, nếu không bị từ chối.
- Pod bị quota từ chối không tồn tại, nên lỗi nằm ở **event của ReplicaSet** (`FailedCreate`), không ở Deployment.
- LimitRange điền requests/limits mặc định cho container không khai báo, và có thể đặt min/max.
- Quota sát giới hạn có thể làm rolling update **kẹt**: Deployment cần tạo Pod mới (maxSurge) trước khi xóa Pod cũ, nhưng quota không cho tạo. Gỡ bằng cách tạm tăng `maxUnavailable`, giảm `replicas`, hoặc nới quota.

## Chuẩn bị

```bash
./lab start 10
```

## Đề bài

1. Deployment `heavy` trong `lab10` muốn 3 replica nhưng chỉ có 2 Pod. Tìm resource nào của quota bị vượt (ví dụ `limits.memory`) và ghi vào `~/cka-answers/10-quota.txt`.

2. Sửa `heavy` để đủ 3 replica: requests `cpu: 200m`, `memory: 128Mi`; limits `memory: 256Mi`.

3. Tạo LimitRange `defaults` trong `lab10`: container không khai báo sẽ nhận request `cpu: 100m`, `memory: 64Mi` và limit `cpu: 200m`, `memory: 128Mi`.

4. Tạo Pod `plain` (image `nginx:1.27`, không khai báo resources). Nó phải chạy được nhờ LimitRange.

5. Tạo Pod `gold` (image `nginx:1.27`) thuộc QoS class `Guaranteed` với CPU 100m và memory 64Mi.

## Gợi ý

<details><summary>Tìm lý do</summary>

`kubectl describe rs -n lab10 -l app=heavy | grep -A3 FailedCreate` và `kubectl describe quota -n lab10`

</details>

<details><summary>Sửa resources nhanh</summary>

`kubectl set resources deploy heavy -n lab10 --requests=cpu=200m,memory=128Mi --limits=memory=256Mi`

</details>

## Chấm bài

```bash
./lab check 10
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 10
```

## Tài liệu

- [Resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Resource quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Limit ranges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Pod QoS classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)

---

← [Lab 09 · DaemonSet, Job và CronJob](../09-daemonset-job-cronjob/README.md) · [Lab 11 · metrics-server và HorizontalPodAutoscaler](../11-hpa-metrics/README.md) →
