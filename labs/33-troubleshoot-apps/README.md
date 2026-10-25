# Lab 33 · Troubleshooting ứng dụng: sáu Deployment hỏng

**Cấp độ 8 · Troubleshooting** · khoảng 40 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Troubleshooting › Quản lý và đánh giá output, log của container; Troubleshooting › Theo dõi tài nguyên cluster và ứng dụng; Workloads & Scheduling › Primitive cho ứng dụng tự phục hồi

## Mục tiêu

Chẩn đoán nhanh và sửa đúng sáu lỗi ứng dụng hay gặp nhất trong đề: image sai, lệnh sai, OOM, không xếp được node, thiếu cấu hình, probe sai.

## Kiến thức cần nắm

- Quy trình: `kubectl get pods` (STATUS, RESTARTS) → `kubectl describe pod` (Events, Last State, Conditions) → `kubectl logs` và `logs --previous` → sửa Deployment, không sửa Pod.
- Bảng tra STATUS: `ImagePullBackOff`/`ErrImagePull` (image), `CrashLoopBackOff` (container chết lặp lại: xem exit code và log), `RunContainerError`/`StartError` (lệnh không chạy được), `CreateContainerConfigError` (thiếu ConfigMap/Secret), `Pending` (không xếp được node: đọc event `FailedScheduling`), `Running` nhưng `0/1` (readiness trượt).
- Exit code: `1` lỗi app, `126/127` lệnh không chạy được hoặc không tồn tại, `137` bị SIGKILL (thường `OOMKilled`), `143` SIGTERM.

## Chuẩn bị

```bash
./lab start 33
```

## Đề bài

1. Namespace `lab33` có sáu Deployment: `img`, `cmd`, `oom`, `pending`, `cfg`, `notready`. Mỗi cái hỏng một kiểu. Sửa để **cả sáu** đều sẵn sàng đủ replica.

2. Ràng buộc khi sửa: `img` dùng `nginx:1.27`; `cmd` vẫn chạy `sleep 3600`; `oom` giữ nguyên lệnh và chỉ đổi memory limit thành `256Mi`; `cfg` phải đọc biến từ ConfigMap `app-settings` với `MODE=prod`; `notready` giữ readinessProbe nhưng kiểm tra đúng đường dẫn.

3. Ghi lý do container của `oom` bị dừng (giá trị `reason` trong `lastState`) vào `~/cka-answers/33-oom.txt`.

## Gợi ý

<details><summary>Nhìn toàn cảnh</summary>

`kubectl get pods -n lab33` rồi `kubectl get events -n lab33 --sort-by=.lastTimestamp | tail -20`

</details>

<details><summary>Lý do lần chết trước</summary>

`kubectl get pod <pod> -n lab33 -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'`

</details>

<details><summary>Pod Pending</summary>

`kubectl describe pod` → `0/3 nodes are available: … didn't match Pod's node affinity/selector`

</details>

## Chấm bài

```bash
./lab check 33
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 33
```

## Tài liệu

- [Debug Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/)
- [Determine the reason for Pod failure](https://kubernetes.io/docs/tasks/debug/debug-application/determine-reason-pod-failure/)

---

← [Lab 32 · Thêm control plane cho cluster HA](../32-control-plane-ha/README.md) · [Lab 34 · Troubleshooting mạng: Service, NetworkPolicy và DNS](../34-troubleshoot-network/README.md) →
