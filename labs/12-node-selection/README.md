# Lab 12 · nodeSelector, node affinity, taint và toleration

**Cấp độ 3 · Scheduling** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Workloads & Scheduling › Admission và scheduling của Pod

## Mục tiêu

Đặt Pod lên đúng node: chọn node bằng label, giữ riêng một node cho workload đặc biệt bằng taint, và cho đúng workload đó vào bằng toleration cộng affinity.

## Kiến thức cần nắm

- `nodeSelector` là điều kiện cứng đơn giản. `nodeAffinity` có `requiredDuringScheduling…` (cứng) và `preferredDuringScheduling…` (cộng điểm, có `weight`).
- **Taint** đẩy Pod ra khỏi node (`NoSchedule`, `PreferNoSchedule`, `NoExecute`). **Toleration** chỉ *cho phép* Pod vào node có taint, không *ép* Pod vào đó. Muốn dành riêng node: taint + toleration + affinity.
- `IgnoredDuringExecution`: đổi label node sau khi Pod đã chạy không đuổi Pod. Riêng taint `NoExecute` thì đuổi.

## Chuẩn bị

```bash
./lab start 12
```

## Đề bài

1. Gắn label `disktype=ssd` cho `$NODE1` và `disktype=hdd` cho `$NODE2`.

2. Trong `lab12`, tạo Pod `fast` (image `nginx:1.27`) chỉ chạy trên node có `disktype=ssd`, dùng `nodeSelector`.

3. Dành `$NODE2` cho workload GPU: gắn taint `dedicated=gpu:NoSchedule` và label `accelerator=nvidia`.

4. Tạo Deployment `gpu-job` (2 replica, image `busybox:1.36`, lệnh `sleep 3600`) chạy **chỉ** trên `$NODE2`: tolerate taint ở trên và dùng `requiredDuringSchedulingIgnoredDuringExecution` với label `accelerator=nvidia`.

5. Tạo Pod `flex` (image `nginx:1.27`) **ưu tiên** (không bắt buộc) node có `disktype=hdd`, weight 80.

## Gợi ý

<details><summary>Gỡ taint</summary>

Thêm dấu `-` ở cuối: `kubectl taint node $NODE2 dedicated-`

</details>

<details><summary>Vì sao Pod tolerate rồi vẫn chạy sang node khác?</summary>

Toleration không chọn node. Cần thêm affinity hoặc nodeSelector.

</details>

## Chấm bài

```bash
./lab check 12
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 12
```

## Tài liệu

- [Assigning Pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)

---

← [Lab 11 · metrics-server và HorizontalPodAutoscaler](../11-hpa-metrics/README.md) · [Lab 13 · Anti-affinity, topology spread và PriorityClass](../13-spread-priority/README.md) →
