# Lab 08 · Init container và sidecar container

**Cấp độ 2 · Workloads** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Workloads & Scheduling › Primitive cho ứng dụng tự phục hồi; Troubleshooting › Quản lý và đánh giá output, log của container

## Mục tiêu

Dùng init container để chờ phụ thuộc, và thêm sidecar đọc log file của ứng dụng cũ ra stdout để `kubectl logs` đọc được.

## Kiến thức cần nắm

- Init container chạy **tuần tự** trước container chính, mỗi cái phải thoát 0. Pod hiển thị `Init:0/1` trong lúc chờ.
- Sidecar kiểu mới (GA từ v1.33): khai báo trong `initContainers` với `restartPolicy: Always`. Nó khởi động trước app, chạy suốt đời Pod và dừng sau app.
- Các container trong Pod dùng chung volume (`emptyDir`) và network namespace (gọi nhau qua `localhost`).
- Spec của Pod đang chạy gần như bất biến: muốn thêm container phải xuất YAML, sửa, rồi `kubectl replace --force -f`.

## Chuẩn bị

```bash
./lab start 8
```

## Đề bài

1. Trong `lab08`, tạo Pod `web` (image `nginx:1.27`) có init container `wait-db` (image `busybox:1.36`) chờ tới khi phân giải được tên `db.lab08.svc.cluster.local`. Pod phải đứng ở `Init:0/1`.

2. Tạo Service `db` kiểu ClusterIP cổng 5432 (không cần selector). Xác nhận Pod `web` chuyển sang `Running`.

3. Pod `legacy` ghi log vào file `/var/log/app/app.log` (volume `logs`). Thêm sidecar tên `log-tail` (image `busybox:1.36`) dạng native sidecar, chạy `tail -n+1 -F /var/log/app/app.log`, để `kubectl logs legacy -c log-tail` thấy log.

## Gợi ý

<details><summary>Lệnh chờ DNS</summary>

`until nslookup db.lab08.svc.cluster.local; do echo waiting; sleep 2; done`

</details>

<details><summary>Thêm container vào Pod đang chạy</summary>

`kubectl get pod legacy -n lab08 -o yaml > legacy.yaml`, sửa, rồi `kubectl replace --force -f legacy.yaml`.

</details>

## Chấm bài

```bash
./lab check 8
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 8
```

## Tài liệu

- [Init containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Sidecar containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Logging architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)

---

← [Lab 07 · Liveness, readiness và startup probe](../07-probes/README.md) · [Lab 09 · DaemonSet, Job và CronJob](../09-daemonset-job-cronjob/README.md) →
