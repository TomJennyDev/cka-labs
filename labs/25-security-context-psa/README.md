# Lab 25 · securityContext và Pod Security Admission

**Cấp độ 6 · Bảo mật** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Workloads & Scheduling › Admission và scheduling của Pod; Cluster Architecture › Quản lý RBAC

## Mục tiêu

Bắt một namespace tuân thủ chuẩn bảo mật `restricted`, sửa workload cũ cho đạt chuẩn, và chạy container với filesystem chỉ đọc.

## Kiến thức cần nắm

- Pod Security Admission bật bằng **label namespace**: `pod-security.kubernetes.io/<enforce|audit|warn>=<privileged|baseline|restricted>`. `enforce` từ chối Pod mới; Pod đang chạy **không** bị đuổi.
- Chuẩn `restricted` đòi: `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]`, `seccompProfile.type: RuntimeDefault` (hoặc `Localhost`), không hostPath/hostNetwork/privileged.
- Với Deployment, Pod bị từ chối không xuất hiện: lỗi nằm ở event `FailedCreate` của ReplicaSet.
- `readOnlyRootFilesystem: true` chặn ghi vào filesystem của image; chỗ cần ghi thì gắn `emptyDir`.

## Chuẩn bị

```bash
./lab start 25
```

## Đề bài

1. Bật cho namespace `lab25` chế độ `enforce` và `warn` ở mức `restricted`.

2. Deployment `api` trong `lab25` đang chạy với root. Sau khi bật enforce, nó không tạo được Pod mới. Sửa `api` đạt chuẩn `restricted`, chạy với UID `1000`, rồi rollout lại để Pod mới được tạo.

3. Tạo Pod `secure` (`busybox:1.36`, `sleep 3600`) đạt chuẩn `restricted`, root filesystem **chỉ đọc**, và ghi được vào `/tmp` nhờ một emptyDir.

## Gợi ý

<details><summary>Xem vì sao Pod bị từ chối</summary>

`kubectl rollout restart deploy api -n lab25` rồi `kubectl describe rs -n lab25 -l app=api | grep -A2 FailedCreate`

</details>

<details><summary>Thử nhanh với dry-run phía server</summary>

`kubectl apply -f pod.yaml --dry-run=server` báo ngay vi phạm PSA mà không tạo gì.

</details>

## Chấm bài

```bash
./lab check 25
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 25
```

## Tài liệu

- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Pod Security Admission](https://kubernetes.io/docs/concepts/security/pod-security-admission/)
- [Configure a Security Context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)

---

← [Lab 24 · User mới bằng chứng chỉ, CSR và kubeconfig](../24-users-csr-kubeconfig/README.md)
