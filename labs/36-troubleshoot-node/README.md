# Lab 36 · Troubleshooting node: worker NotReady

**Cấp độ 8 · Troubleshooting** · khoảng 35 phút · môi trường: kind hoặc kubeadm (cần vào node)

Năng lực CKA: Troubleshooting › Troubleshoot cluster và node

## Mục tiêu

Đưa một worker `NotReady` trở lại: xác định kubelet có chạy không, đọc journal để tìm cấu hình sai, sửa và bảo đảm kubelet tự chạy sau khi khởi động lại máy.

## Kiến thức cần nắm

- Node `NotReady` (hoặc `Unknown`) phần lớn do kubelet: không chạy, chạy rồi chết vì cấu hình sai, không nói chuyện được với container runtime, hoặc chứng chỉ hết hạn.
- Trên node: `systemctl status kubelet`, `journalctl -u kubelet -n 50`, cấu hình ở `/var/lib/kubelet/config.yaml`, cờ ở `/var/lib/kubelet/kubeadm-flags.env`, unit drop-in ở `/usr/lib/systemd/system/kubelet.service.d/10-kubeadm.conf`.
- `systemctl enable --now kubelet` vừa chạy ngay vừa tự chạy khi boot. Chỉ `start` thì sau reboot lại hỏng.

## Chuẩn bị

```bash
./lab start 36
```

## Đề bài

1. `$NODE2` đang `NotReady`. Đưa nó về `Ready`.

2. Bảo đảm kubelet trên `$NODE2` tự khởi động cùng máy.

3. Ghi đường dẫn file cấu hình mà bạn đã sửa vào `~/cka-answers/36-file.txt`.

## Gợi ý

<details><summary>kubelet có chạy không?</summary>

`./lab ssh $NODE2` rồi `systemctl status kubelet`

</details>

<details><summary>kubelet chạy rồi chết</summary>

`journalctl -u kubelet -n 30 --no-pager` và tìm dòng `failed to load` / `no such file`.

</details>

## Chấm bài

```bash
./lab check 36
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 36
```

## Tài liệu

- [Troubleshooting clusters](https://kubernetes.io/docs/tasks/debug/debug-cluster/)
- [kubelet configuration file](https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/)

---

← [Lab 35 · Troubleshooting control plane: scheduler và controller-manager](../35-troubleshoot-control-plane/README.md) · [Lab 37 · Theo dõi tài nguyên, event và log](../37-monitoring-logs/README.md) →
