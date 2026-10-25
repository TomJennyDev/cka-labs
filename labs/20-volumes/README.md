# Lab 20 · Volume: emptyDir, hostPath, projected và Downward API

**Cấp độ 5 · Storage** · khoảng 30 phút · môi trường: kind hoặc kubeadm (cần vào node)

Năng lực CKA: Storage › Volume type, access mode, reclaim policy

## Mục tiêu

Chọn đúng loại volume cho từng nhu cầu: chia sẻ dữ liệu giữa container trong Pod, đọc ghi thư mục của node, và gom nhiều nguồn cấu hình vào một thư mục.

## Kiến thức cần nắm

- **emptyDir** sống theo Pod, dùng chung giữa các container. `medium: Memory` là tmpfs (tính vào memory limit), `sizeLimit` giới hạn dung lượng.
- **hostPath** gắn thư mục của node vào Pod; dữ liệu gắn với một node và là rủi ro bảo mật. `type: DirectoryOrCreate` tự tạo thư mục.
- **projected** gộp `configMap`, `secret`, `downwardAPI`, `serviceAccountToken` vào một thư mục.
- **Downward API** đưa thông tin của chính Pod (tên, namespace, IP, node, label, resources) vào biến môi trường hoặc file.

## Chuẩn bị

```bash
./lab start 20
```

## Đề bài

1. Trong `lab20`, tạo Pod `shared` có 2 container dùng chung emptyDir `data` (tmpfs, tối đa 64Mi) gắn tại `/data`: container `writer` (`busybox:1.36`) ghi `date` vào `/data/out.log` mỗi 2 giây; container `reader` (`busybox:1.36`) chạy `tail -F /data/out.log`.

2. Tạo Pod `hostlog` (`busybox:1.36`) chạy trên `$NODE1`, gắn hostPath `/var/log/lab20` (tự tạo nếu chưa có) tại `/logs`, và ghi file `/logs/hello.txt` có nội dung `hello from pod`.

3. Tạo Pod `info` (`busybox:1.36`, `sleep 3600`) có biến `POD_IP` và `NODE_NAME` lấy từ Downward API, và một projected volume tại `/etc/info` gồm: ConfigMap `app-cfg` (có sẵn), label của Pod vào file `labels`, và token ServiceAccount hạn 3600 giây vào file `token`.

## Gợi ý

<details><summary>Ghi vào emptyDir trong vòng lặp</summary>

`sh -c 'while true; do date >> /data/out.log; sleep 2; done'`

</details>

<details><summary>Pod chạy trên một node cụ thể</summary>

Dùng `nodeName: <node>` hoặc `nodeSelector: {kubernetes.io/hostname: <node>}`.

</details>

## Chấm bài

```bash
./lab check 20
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 20
```

## Tài liệu

- [Volumes](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Projected volumes](https://kubernetes.io/docs/concepts/storage/projected-volumes/)
- [Downward API](https://kubernetes.io/docs/concepts/workloads/pods/downward-api/)

---

← [Lab 19 · Gateway API, HTTPRoute và ReferenceGrant](../19-gateway-api/README.md) · [Lab 21 · PersistentVolume, PVC và reclaim policy](../21-pv-pvc/README.md) →
