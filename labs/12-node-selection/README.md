# Lab 12 · nodeSelector, node affinity, taint và toleration

**Cấp độ 3 · Scheduling** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Workloads & Scheduling › Admission và scheduling của Pod

Mức hỗ trợ: **Dẫn hướng**. Mỗi câu chỉ ra chỗ tra tài liệu, khung lệnh và cách tự kiểm, nhưng không đưa đáp án. Hãy thử tự làm trước, kẹt mới mở.

## Mục tiêu

Đặt Pod lên đúng node: chọn node bằng label, giữ riêng một node cho workload đặc biệt bằng taint, và cho đúng workload đó vào bằng toleration cộng affinity.

## Cần làm trước

- [Lab 05 · Deployment: scale, rolling update, rollback](../05-deployment-rollout/README.md)
- [Lab 09 · DaemonSet, Job và CronJob](../09-daemonset-job-cronjob/README.md)

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

## Cách tiếp cận

### Câu 1 · Gắn label cho node

**Khung:** `kubectl label node <node> <key>=<value>`. Hai node, hai lệnh.

**Tự kiểm:** `kubectl get nodes -L disktype` thêm cột `DISKTYPE`.

### Câu 2 · nodeSelector

**Tra:** `kubectl explain pod.spec.nodeSelector`. Đây là một map, đặt ngang hàng `containers`.

**Khung:** `kubectl run fast … $do > fast.yaml`, thêm `nodeSelector:` vào `spec`, rồi apply.

**Tự kiểm:** `kubectl get pod fast -n lab12 -o wide`. Cột NODE phải là `$NODE1`.

### Câu 3 · Taint

**Khung:** `kubectl taint node <node> <key>=<value>:<effect>`. Label `accelerator` gắn như câu 1.

**Tự kiểm:** `kubectl describe node $NODE2 | grep Taints`.

### Câu 4 · Toleration + node affinity bắt buộc

Hai cơ chế giải quyết hai việc khác nhau:

- **Toleration** chỉ *cho phép* Pod chạy trên node có taint, không *kéo* Pod về đó.
- **Affinity bắt buộc** mới *giới hạn* Pod chỉ chạy ở node có label.

Bài này cần cả hai.

**Tra:** trang *Assigning Pods to Nodes*, mục *Node affinity*, có sẵn YAML mẫu để chép. `kubectl explain pod.spec.affinity.nodeAffinity` cho cấu trúc.

**Khung:** `kubectl create deploy gpu-job --replicas=2 … $do -- sleep 3600 > gpu.yaml`. Trong `template.spec` thêm `tolerations:` (key, operator `Equal`, value, effect) và `affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms[].matchExpressions[]`.

**Tự kiểm:** `kubectl get pods -n lab12 -l app=gpu-job -o wide`. Cả hai Pod nằm trên `$NODE2`.

### Câu 5 · Affinity ưu tiên

**Tra:** cùng trang, ví dụ `preferredDuringSchedulingIgnoredDuringExecution`. Cấu trúc khác bản required: mỗi phần tử có `weight` và `preference.matchExpressions`.

**Bẫy:** `$NODE2` có taint, mà `flex` không tolerate. Vì vậy dù ưu tiên `hdd`, Pod vẫn phải chạy ở node khác. Đó là hành vi đúng: preferred không bao giờ thắng taint.

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
