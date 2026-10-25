# Lab 11 · metrics-server và HorizontalPodAutoscaler

**Cấp độ 2 · Workloads** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Workloads & Scheduling › Autoscaling; Troubleshooting › Theo dõi tài nguyên cluster và ứng dụng

## Mục tiêu

Theo dõi CPU/RAM bằng `kubectl top`, tạo HPA có behavior, và sửa HPA hiện `<unknown>` vì Pod không khai báo requests.

## Kiến thức cần nắm

- metrics-server lấy số liệu từ kubelet và phục vụ Metrics API cho `kubectl top` và HPA. Lab 00 đã cài nó trên kind.
- HPA tính `desiredReplicas = ceil(replicas × giá trị hiện tại / mục tiêu)`. Utilization tính theo **requests**, nên Pod không có CPU request thì HPA không tính được (`<unknown>`).
- `behavior.scaleDown.stabilizationWindowSeconds` (mặc định 300) chống dao động: khi giảm, HPA lấy khuyến nghị cao nhất trong cửa sổ.

## Chuẩn bị

```bash
./lab start 11
```

## Đề bài

1. Ghi tên Pod trong namespace `kube-system` đang dùng **nhiều memory nhất** vào `~/cka-answers/11-top-pod.txt`.

2. Trong `lab11`, tạo HPA cho Deployment `web`: tối thiểu 2, tối đa 6 replica, mục tiêu CPU **50%**, và scale down chờ **60 giây**.

3. HPA `api` đã có sẵn nhưng hiển thị `<unknown>`. Sửa Deployment `api` để HPA đọc được metric (CPU request `100m`).

4. (Không chấm) Tạo tải để thấy HPA scale up: `kubectl run load -n lab11 --image=busybox:1.36 -- sh -c 'while true; do wget -qO- http://web >/dev/null; done'` rồi `kubectl get hpa -n lab11 -w`.

## Gợi ý

<details><summary>Sắp xếp theo memory</summary>

`kubectl top pod -n kube-system --sort-by=memory --no-headers | head -1`

</details>

<details><summary>HPA có behavior</summary>

`kubectl autoscale` không đặt được behavior. Sinh YAML (`$do`) rồi thêm `spec.behavior`.

</details>

## Chấm bài

```bash
./lab check 11
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 11
```

## Tài liệu

- [Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [HPA walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/)
- [Resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)

---

← [Lab 10 · Requests, limits, LimitRange và ResourceQuota](../10-resources-quota/README.md) · [Lab 12 · nodeSelector, node affinity, taint và toleration](../12-node-selection/README.md) →
