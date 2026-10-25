# Lab 20 · Volume: emptyDir, hostPath, projected và Downward API

**Cấp độ 5 · Storage** · khoảng 30 phút · môi trường: kind hoặc kubeadm (cần vào node)

Năng lực CKA: Storage › Volume type, access mode, reclaim policy

Mức hỗ trợ: **Dẫn hướng**. Mỗi câu chỉ ra chỗ tra tài liệu, khung lệnh và cách tự kiểm, nhưng không đưa đáp án. Hãy thử tự làm trước, kẹt mới mở.

## Mục tiêu

Chọn đúng loại volume cho từng nhu cầu: chia sẻ dữ liệu giữa container trong Pod, đọc ghi thư mục của node, và gom nhiều nguồn cấu hình vào một thư mục.

## Cần làm trước

- [Lab 06 · ConfigMap và Secret](../06-configmap-secret/README.md)
- [Lab 08 · Init container và sidecar container](../08-init-sidecar/README.md)

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

## Cách tiếp cận

### Câu 1 · emptyDir dùng chung giữa 2 container

**Tra:** trang *Volumes*, mục *emptyDir*: `medium: Memory` là tmpfs; `sizeLimit`.

**Khung:** một `volumes[]` ở cấp Pod, cả hai container cùng `volumeMounts` tới nó.

**Tự kiểm:** `kubectl logs shared -n lab20 -c reader` thấy ngày giờ tăng dần; `kubectl exec shared -c writer -n lab20 -- df -h /data` thấy `tmpfs 64M`.

### Câu 2 · hostPath trên một node cụ thể

**Tra:** cùng trang, mục *hostPath*, bảng các giá trị `type`. Giá trị nào "tạo nếu chưa có"?

**Khung:** ép Pod lên node bằng `nodeSelector` với label có sẵn `kubernetes.io/hostname`, hoặc bằng `nodeName`.

**Tự kiểm:** `./lab ssh $NODE1`, rồi `cat /var/log/lab20/hello.txt`.

**Bẫy:** hostPath gắn Pod với một node và mở đường cho Pod đọc filesystem của host. Trong thực tế hạn chế dùng; mức `restricted` của PSA cấm nó.

### Câu 3 · Downward API + projected volume

**Tra:** trang *Expose Pod Information to Containers Through Environment Variables* (`fieldRef`), và *Projected Volumes* (có ví dụ gộp configMap + downwardAPI + serviceAccountToken).

**Khung:** `env[].valueFrom.fieldRef.fieldPath` cho `status.podIP`, `spec.nodeName`. `volumes[].projected.sources[]` có 3 nguồn.

**Tự kiểm:** `kubectl exec info -n lab20 -- sh -c 'env | grep -E "POD_IP|NODE_NAME"; ls /etc/info; cat /etc/info/labels'`.

**Bẫy:** Pod cần có label thì file `labels` mới có nội dung.

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
