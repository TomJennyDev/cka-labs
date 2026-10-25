# Lab 21 · PersistentVolume, PVC và reclaim policy

**Cấp độ 5 · Storage** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Storage › PersistentVolume và PersistentVolumeClaim; Storage › Volume type, access mode, reclaim policy

## Mục tiêu

Cấp phát lưu trữ thủ công: tạo PV, để PVC bind đúng PV, dùng trong Pod, và tái sử dụng một PV đã `Released` mà không mất dữ liệu.

## Kiến thức cần nắm

- PVC bind với PV khi khớp **storageClassName**, **accessModes** (PV phải có mode PVC xin) và **dung lượng** (PV ≥ PVC). Một PV chỉ bind với một PVC.
- Access mode: `ReadWriteOnce` (một node), `ReadOnlyMany`, `ReadWriteMany`, `ReadWriteOncePod` (một Pod).
- Reclaim policy: `Retain` (xóa PVC thì PV thành `Released`, dữ liệu còn), `Delete` (xóa luôn disk). PV `Released` vẫn giữ `claimRef` cũ nên không bind lại được cho tới khi admin gỡ `claimRef`.
- `spec.volumeName` trong PVC chỉ định đích danh PV muốn bind.

## Chuẩn bị

```bash
./lab start 21
```

## Đề bài

1. Tạo PV `pv-log`: 1Gi, `ReadWriteOnce`, reclaim `Retain`, storageClassName `manual`, hostPath `/mnt/lab21/log` (tự tạo).

2. Trong `lab21`, tạo PVC `log-claim` xin 500Mi `ReadWriteOnce` class `manual`. Nó phải bind với `pv-log`.

3. Tạo Pod `logger` (`busybox:1.36`) dùng `log-claim` tại `/log`, ghi `ok` vào `/log/app.log` rồi `sleep 3600`.

4. PV `pv-old` đang ở trạng thái `Released` sau khi PVC cũ bị xóa. Đưa nó về `Available` **mà không xóa và tạo lại PV**, rồi tạo PVC `reuse` trong `lab21` bind **đích danh** vào `pv-old`.

## Gợi ý

<details><summary>PVC đứng Pending?</summary>

`kubectl describe pvc log-claim -n lab21` và so storageClassName, accessModes, dung lượng với PV.

</details>

<details><summary>Gỡ claimRef</summary>

`kubectl patch pv pv-old --type=json -p '[{"op":"remove","path":"/spec/claimRef"}]'`

</details>

## Chấm bài

```bash
./lab check 21
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 21
```

## Tài liệu

- [Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Configure a Pod to use a PersistentVolume](https://kubernetes.io/docs/tasks/configure-pod-container/configure-persistent-volume-storage/)

---

← [Lab 20 · Volume: emptyDir, hostPath, projected và Downward API](../20-volumes/README.md) · [Lab 22 · StorageClass, dynamic provisioning và StatefulSet](../22-storageclass-statefulset/README.md) →
