# Lab 29 · Sao lưu và khôi phục etcd

**Cấp độ 7 · Vận hành cluster** · khoảng 40 phút · môi trường: kind hoặc kubeadm (cần vào node)

Năng lực CKA: Cluster Architecture › Quản lý vòng đời cluster (nâng cấp); Cluster Architecture › Tạo và quản lý cluster bằng kubeadm

## Mục tiêu

Chụp snapshot etcd đúng cách, và khôi phục cluster về thời điểm chụp khi dữ liệu bị thay đổi sau đó.

## Kiến thức cần nắm

- etcd bật TLS hai chiều: `etcdctl` cần `--endpoints`, `--cacert`, `--cert`, `--key`. Lấy đường dẫn từ `/etc/kubernetes/manifests/etcd.yaml`.
- `etcdctl snapshot save` chụp; `etcdutl snapshot status` kiểm tra; `etcdutl snapshot restore --data-dir <thư mục mới>` khôi phục ra thư mục **mới**.
- Sau khi restore, sửa `hostPath` của volume `etcd-data` trong `etcd.yaml` trỏ sang thư mục mới. kubelet tự tạo lại Pod etcd; API server có thể mất 1–2 phút để trở lại.
- Restore đưa **toàn bộ** cluster về thời điểm chụp: object tạo sau đó biến mất.

## Chuẩn bị

```bash
./lab start 29
```

Setup cài `etcdctl` và `etcdutl` v3.6.16 vào node control plane nếu chưa có (tải từ GitHub), và tạo namespace `lab29-before`.

## Đề bài

1. Vào node control plane (`./lab ssh $CP`). Ghi giá trị `--data-dir` của etcd vào `/root/29-datadir.txt` trên node.

2. Chụp snapshot etcd vào `/opt/etcd-backup.db` trên node control plane và kiểm tra nó bằng `etcdutl snapshot status`.

3. **Sau** khi chụp, tạo namespace `lab29-after` (giả lập thay đổi xảy ra sau lần sao lưu).

4. Khôi phục snapshot ra `/var/lib/etcd-restore` và cho etcd chạy trên dữ liệu đó. Kết quả: `lab29-before` còn, `lab29-after` không còn.

## Gợi ý

<details><summary>Biến cho đỡ gõ</summary>

`export ETCDCTL_API=3; E="--endpoints=https://127.0.0.1:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/server.crt --key=/etc/kubernetes/pki/etcd/server.key"`

</details>

<details><summary>API server không trả lời sau khi sửa etcd.yaml?</summary>

Chờ 1–2 phút; xem `crictl ps -a | grep -E 'etcd|apiserver'` và `crictl logs <id>` trên node.

</details>

## Chấm bài

```bash
./lab check 29
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 29
```

## Tài liệu

- [Operating etcd clusters for Kubernetes](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
- [etcd disaster recovery](https://etcd.io/docs/v3.6/op-guide/recovery/)

---

← [Lab 28 · CustomResourceDefinition và Operator](../28-crd-operator/README.md) · [Lab 30 · Nâng cấp cluster kubeadm 1.34 → 1.35](../30-kubeadm-upgrade/README.md) →
