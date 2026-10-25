# Lab 32 · Thêm control plane cho cluster HA

**Cấp độ 7 · Vận hành cluster** · khoảng 60 phút · môi trường: kubeadm trên máy ảo

Năng lực CKA: Cluster Architecture › Control plane high-availability; Cluster Architecture › Tạo và quản lý cluster bằng kubeadm

## Mục tiêu

Biến cluster một control plane thành ba control plane với etcd xếp chồng (stacked), hiểu vai trò của endpoint chung và load balancer.

## Kiến thức cần nắm

- HA cần: một **endpoint ổn định** cho API (`--control-plane-endpoint`, thường là load balancer hoặc VIP như kube-vip), **số lẻ** control plane (3 hoặc 5) để etcd giữ quorum.
- `kubeadm init --upload-certs` lưu cert control plane (mã hóa) vào Secret `kubeadm-certs`, hết hạn sau 2 giờ; tạo lại bằng `kubeadm init phase upload-certs --upload-certs`, lệnh này in ra **certificate key**.
- Join control plane: `kubeadm join <endpoint> --token … --discovery-token-ca-cert-hash … --control-plane --certificate-key …`.
- API server chạy song song trên cả 3 node; scheduler và controller-manager chỉ một bản làm việc (leader, giữ Lease trong `kube-system`).

## Chuẩn bị

```bash
./lab start 32
```

Cần cluster từ lab 01. Dựng thêm 2 máy ảo `cp-2` (192.168.56.13) và `cp-3` (192.168.56.14):
```bash
cd env/kubeadm && HA=1 vagrant up cp-2 cp-3
```
Lab dùng tên `k8s-api` trong `/etc/hosts` trỏ về cp-1 thay cho load balancer. Trong thực tế, đặt HAProxy hoặc kube-vip trước 3 API server.

## Đề bài

1. Trên `cp-1`, tạo lại certificate key và lệnh join.

2. Join `cp-2` và `cp-3` làm control plane.

3. Ghi số member etcd vào `~/cka-answers/32-etcd-members.txt`, và tên node đang giữ Lease `kube-scheduler` vào `~/cka-answers/32-leader.txt`.

## Gợi ý

<details><summary>Danh sách member etcd</summary>

`kubectl -n kube-system exec etcd-cp-1 -- etcdctl --endpoints=https://127.0.0.1:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/server.crt --key=/etc/kubernetes/pki/etcd/server.key member list -w table`

</details>

## Chấm bài

```bash
./lab check 32
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 32
```

## Tài liệu

- [Creating highly available clusters with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/)
- [Options for HA topology](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/)

---

← [Lab 31 · Chứng chỉ, cấu hình control plane và kubelet](../31-control-plane-config/README.md) · [Lab 33 · Troubleshooting ứng dụng: sáu Deployment hỏng](../33-troubleshoot-apps/README.md) →
