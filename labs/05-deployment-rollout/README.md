# Lab 05 · Deployment: scale, rolling update, rollback

**Cấp độ 2 · Workloads** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Workloads & Scheduling › Deployment, rolling update, rollback

## Mục tiêu

Điều khiển vòng đời một Deployment: scale, chỉnh chiến lược cập nhật, nâng image có ghi chú, nhận ra rollout bị kẹt và quay lại phiên bản tốt.

## Kiến thức cần nắm

- Deployment quản lý ReplicaSet; mỗi lần đổi **Pod template** (image, env…) tạo ReplicaSet mới. Đổi `replicas` thì không.
- `RollingUpdate` với `maxSurge` (được tạo dư bao nhiêu Pod) và `maxUnavailable` (được thiếu bao nhiêu Pod sẵn sàng). `maxUnavailable: 0` là không gián đoạn. `Recreate` xóa hết Pod cũ rồi mới tạo mới.
- `kubectl rollout history` đọc annotation `kubernetes.io/change-cause` của từng ReplicaSet. `rollout undo --to-revision=N` quay về một revision; revision đó được đánh số mới.
- Image sai thì Pod mới đứng `ImagePullBackOff`. Với `maxUnavailable: 0`, Pod cũ vẫn phục vụ: rollout kẹt nhưng không sập dịch vụ.

## Chuẩn bị

```bash
./lab start 5
```

## Đề bài

1. Scale Deployment `shop` trong namespace `lab05` lên **4** replica.

2. Đặt chiến lược cho `shop`: `RollingUpdate`, `maxSurge: 1`, `maxUnavailable: 0`, và giữ tối đa **5** revision.

3. Nâng `shop` lên `nginx:1.28` với change-cause `nang cap nginx 1.28`. Chờ rollout xong.

4. Một đồng nghiệp đẩy `nginx:1.99` (không tồn tại) lên `shop`. Hãy làm điều đó, quan sát rollout kẹt, rồi **rollback** về revision chạy `nginx:1.28`.

5. Deployment `legacy` không được phép chạy hai phiên bản cùng lúc. Đổi chiến lược của nó sang `Recreate`.

## Gợi ý

<details><summary>Ghi change-cause</summary>

Sau `kubectl set image`, chạy `kubectl annotate deploy/shop kubernetes.io/change-cause='…' --overwrite`.

</details>

<details><summary>Đổi sang Recreate</summary>

Khi chuyển sang `Recreate` phải xóa luôn khối `rollingUpdate`, nếu không API báo lỗi. `kubectl edit` hoặc patch với `"rollingUpdate": null`.

</details>

## Chấm bài

```bash
./lab check 5
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 5
```

## Tài liệu

- [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [kubectl rollout](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/)

---

← [Lab 04 · Sinh YAML nhanh và trích xuất bằng jsonpath](../04-yaml-jsonpath/README.md) · [Lab 06 · ConfigMap và Secret](../06-configmap-secret/README.md) →
