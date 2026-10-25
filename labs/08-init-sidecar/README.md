# Lab 08 · Init container và sidecar container

**Cấp độ 2 · Workloads** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Workloads & Scheduling › Primitive cho ứng dụng tự phục hồi; Troubleshooting › Quản lý và đánh giá output, log của container

Mức hỗ trợ: **Cầm tay chỉ việc**. Mỗi bước có lệnh, giải thích vì sao và kết quả bạn sẽ thấy. Lần đầu làm theo từng bước; lần hai đóng phần hướng dẫn lại và tự làm đề bài.

## Mục tiêu

Dùng init container để chờ phụ thuộc, và thêm sidecar đọc log file của ứng dụng cũ ra stdout để `kubectl logs` đọc được.

## Cần làm trước

- [Lab 03 · Pod, label, log và exec](../03-pods/README.md)
- [Lab 07 · Liveness, readiness và startup probe](../07-probes/README.md)

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

## Hướng dẫn từng bước

### Bước 1 · Init container chạy trước, lần lượt

Init container chạy lần lượt và phải **thoát thành công** thì container chính mới khởi động. Dùng nó để chờ phụ thuộc (DB, migration, tải cấu hình).

```bash
./lab start 8
kubectl run web -n lab08 --image=nginx:1.27 $do > web.yaml
vi web.yaml
```
Thêm `initContainers` vào `spec`, ngang hàng với `containers`:
```yaml
spec:
  initContainers:
  - name: wait-db
    image: busybox:1.36
    command: ["sh", "-c", "until nslookup db.lab08.svc.cluster.local; do echo waiting; sleep 2; done"]
  containers:
  - name: web
    image: nginx:1.27
```
```bash
kubectl apply -n lab08 -f web.yaml
kubectl get pod web -n lab08
kubectl logs web -n lab08 -c wait-db --tail=3
```

> **Kết quả:** `STATUS Init:0/1`; log init container lặp `waiting` vì tên `db` chưa tồn tại.

### Bước 2 · Tạo phụ thuộc và xem Pod chạy tiếp

Service không có selector vẫn có ClusterIP và tên DNS, đủ để `nslookup` thành công.

```bash
kubectl create svc clusterip db -n lab08 --tcp=5432
kubectl get pod web -n lab08 -w        # Init:0/1 → PodInitializing → Running
```

### Bước 3 · Vì sao cần sidecar

Pod `legacy` ghi log vào file chứ không ra stdout, nên `kubectl logs` không thấy gì. Mẫu chuẩn: một container phụ cùng mount volume đó và `tail` file ra stdout của nó.

```bash
kubectl logs legacy -n lab08                 # trống
kubectl exec legacy -n lab08 -- tail -2 /var/log/app/app.log
```

### Bước 4 · Native sidecar

Từ Kubernetes 1.29, sidecar "chuẩn" là **init container có `restartPolicy: Always`**. Nó khởi động trước container chính, chạy suốt đời Pod và được tắt sau cùng. Hầu hết trường của Pod không sửa được khi đang chạy, nên xuất YAML, sửa rồi `replace --force` (xóa và tạo lại).

```bash
kubectl get pod legacy -n lab08 -o yaml > legacy.yaml
vi legacy.yaml
```
Thêm vào `spec`:
```yaml
  initContainers:
  - name: log-tail
    image: busybox:1.36
    restartPolicy: Always
    command: ["sh", "-c", "tail -n+1 -F /var/log/app/app.log"]
    volumeMounts:
    - {name: logs, mountPath: /var/log/app}
```
```bash
kubectl replace --force -f legacy.yaml
kubectl get pod legacy -n lab08          # READY 2/2
kubectl logs legacy -n lab08 -c log-tail
```

> **Kết quả:** thấy các dòng `… heartbeat order-service`.

### Bước 5 · Chấm bài

```bash
./lab check 8
```

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
