# Lab 03 · Pod, label, log và exec

**Cấp độ 1 · Nền tảng kubectl** · khoảng 25 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Troubleshooting › Quản lý và đánh giá output, log của container

## Mục tiêu

Tạo và sửa Pod thật nhanh bằng lệnh imperative, đọc log, chạy lệnh trong container, và biết field nào của Pod đang chạy thì sửa được.

## Kiến thức cần nắm

- `kubectl run` tạo Pod; `--labels`, `--env`, `--port`, `--command -- …` bao phủ phần lớn yêu cầu.
- Phần lớn spec của Pod đang chạy là bất biến. Sửa được tại chỗ: `image` của container, `activeDeadlineSeconds`, `tolerations` (chỉ thêm), label và annotation.
- Field khác (command, env, resources…) phải xóa rồi tạo lại: `kubectl get pod x -o yaml > x.yaml`, sửa, `kubectl replace --force -f x.yaml`.
- `kubectl logs` đọc stdout/stderr; `--previous` cho lần chạy trước khi container bị restart; `-c` chọn container.

## Chuẩn bị

```bash
./lab start 3
```

## Đề bài

1. Trong namespace `lab03`, tạo Pod `web` image `nginx:1.27`, label `app=web` và `tier=front`, khai báo containerPort 80.

2. Tạo Pod `worker` image `busybox:1.36`, biến môi trường `MODE=lab`, chạy lệnh `sh -c 'echo started; sleep 3600'`.

3. Pod `noisy` đang ghi log. Ghi mọi dòng chứa `ERROR` trong log của nó vào `~/cka-answers/03-errors.txt`.

4. Pod `broken` đứng `ImagePullBackOff`. Sửa nó chạy được với image `nginx:1.27` mà **không xóa Pod**.

5. Ghi hostname bên trong container của Pod `web` vào `~/cka-answers/03-hostname.txt` (lấy bằng `kubectl exec`).

6. Xóa ngay Pod `old` (không chờ grace period).

## Gợi ý

<details><summary>Đặt namespace mặc định cho đỡ gõ</summary>

`kubectl config set-context --current --namespace=lab03` (nhớ đổi lại `default` sau lab).

</details>

<details><summary>Sửa image tại chỗ</summary>

`kubectl set image pod/broken <tên-container>=nginx:1.27`. Tên container xem bằng `kubectl get pod broken -o jsonpath='{.spec.containers[*].name}'`.

</details>

## Chấm bài

```bash
./lab check 3
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 3
```

## Tài liệu

- [Pods](https://kubernetes.io/docs/concepts/workloads/pods/)
- [kubectl run](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)

---

← [Lab 02 · kubectl, namespace, context và Kubernetes API](../02-kubectl-api/README.md) · [Lab 04 · Sinh YAML nhanh và trích xuất bằng jsonpath](../04-yaml-jsonpath/README.md) →
