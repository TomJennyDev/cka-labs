# Lab 35 · Troubleshooting control plane: scheduler và controller-manager

**Cấp độ 8 · Troubleshooting** · khoảng 40 phút · môi trường: kind hoặc kubeadm (cần vào node)

Năng lực CKA: Troubleshooting › Troubleshoot thành phần control plane

## Mục tiêu

Nhận ra thành phần control plane nào hỏng chỉ từ triệu chứng, đọc log khi kubectl không giúp được, và sửa static pod manifest.

## Kiến thức cần nắm

- Triệu chứng chỉ điểm: Deployment không có ReplicaSet → **kube-controller-manager**. Pod đứng `Pending` mà không có event → **kube-scheduler**. `kubectl` báo connection refused → **kube-apiserver** hoặc **etcd**.
- Control plane là static pod: log đọc bằng `kubectl -n kube-system logs <pod>`, hoặc trên node bằng `crictl ps -a` + `crictl logs <id>`, hoặc file trong `/var/log/pods/`. Pod không được tạo luôn thì xem `journalctl -u kubelet`.
- Sửa file trong `/etc/kubernetes/manifests` là đủ; kubelet tự tạo lại Pod (có thể mất 20–60 giây).

## Chuẩn bị

```bash
./lab start 35
```

## Đề bài

1. Deployment `probe` trong `lab35` (2 replica) đã được tạo nhưng không có Pod nào. Tìm thành phần control plane hỏng và sửa.

2. Sau đó Pod của `probe` vẫn không chạy. Tìm và sửa thành phần thứ hai.

3. Ghi tên hai thành phần đã sửa (ví dụ `kube-apiserver`), mỗi tên một dòng, vào `~/cka-answers/35-components.txt`.

## Gợi ý

<details><summary>Không có ReplicaSet</summary>

`kubectl get rs -n lab35` trống → ai tạo ReplicaSet? `kubectl -n kube-system get pods | grep controller`

</details>

<details><summary>Container control plane chết ngay khi khởi động</summary>

`./lab ssh $CP` rồi `crictl ps -a | grep -E 'scheduler|controller'` và `crictl logs <container-id>`

</details>

## Chấm bài

```bash
./lab check 35
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 35
```

## Tài liệu

- [Troubleshooting clusters](https://kubernetes.io/docs/tasks/debug/debug-cluster/)
- [Debugging Kubernetes nodes with crictl](https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/)

---

← [Lab 34 · Troubleshooting mạng: Service, NetworkPolicy và DNS](../34-troubleshoot-network/README.md) · [Lab 36 · Troubleshooting node: worker NotReady](../36-troubleshoot-node/README.md) →
