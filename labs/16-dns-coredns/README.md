# Lab 16 · DNS trong cluster và CoreDNS

**Cấp độ 4 · Services & Networking** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Services & Networking › CoreDNS; Troubleshooting › Troubleshoot Service và networking

## Mục tiêu

Hiểu tên DNS của Service và Pod, đọc cấu hình DNS của Pod, tùy chỉnh `dnsPolicy`, và sửa Corefile của CoreDNS để phân giải tên nội bộ của công ty.

## Kiến thức cần nắm

- Service: `<svc>.<ns>.svc.<cluster-domain>` (mặc định `cluster.local`). Pod đọc `/etc/resolv.conf`: nameserver là ClusterIP của Service `kube-dns`, có `search <ns>.svc.cluster.local svc.cluster.local cluster.local` và `ndots:5`.
- `dnsPolicy`: `ClusterFirst` (mặc định, dùng CoreDNS), `Default` (dùng DNS của node, **không** phân giải được Service), `None` (tự khai báo trong `dnsConfig`).
- CoreDNS cấu hình bằng ConfigMap `coredns` trong `kube-system` (Corefile). Có thể thêm server block riêng cho một zone. Plugin `reload` tự nạp lại sau khoảng 30 giây; muốn nhanh thì `kubectl -n kube-system rollout restart deploy coredns`.

## Chuẩn bị

```bash
./lab start 16
```

## Đề bài

1. Ghi ClusterIP của Service DNS của cluster vào `~/cka-answers/16-dns-ip.txt`, và cluster domain vào `~/cka-answers/16-domain.txt`.

2. Pod `client` trong `lab16` không phân giải được tên Service nào. Tìm nguyên nhân và sửa để từ `client` chạy `nslookup web.lab16` thành công. Giữ nguyên tên Pod và image.

3. Tạo Pod `custom-dns` (image `busybox:1.36`, lệnh `sleep 3600`) **chỉ** dùng nameserver `1.1.1.1`, search domain `lab16.svc.cluster.local`, option `ndots: 2`.

4. Công ty có máy `legacy.corp.internal` ở `10.10.10.10` mà DNS công cộng không biết. Sửa CoreDNS để mọi Pod phân giải được tên này, không làm hỏng DNS của cluster.

## Gợi ý

<details><summary>Tìm cluster domain</summary>

`kubectl -n kube-system get cm coredns -o yaml` (dòng `kubernetes cluster.local …`) hoặc `clusterDomain` trong `/var/lib/kubelet/config.yaml` của node.

</details>

<details><summary>Thêm zone vào Corefile</summary>

Thêm một server block mới ở cuối Corefile, dùng plugin `hosts`:
```
corp.internal:53 {
    errors
    hosts {
        10.10.10.10 legacy.corp.internal
    }
}
```

</details>

## Chấm bài

```bash
./lab check 16
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 16
```

## Tài liệu

- [DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Customizing DNS Service](https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/)
- [Debugging DNS resolution](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)

---

← [Lab 15 · Service, EndpointSlice và kết nối giữa các Pod](../15-services/README.md) · [Lab 17 · NetworkPolicy theo mô hình mặc định chặn](../17-network-policy/README.md) →
