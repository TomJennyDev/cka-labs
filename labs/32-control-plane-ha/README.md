# Lab 32 · Thêm control plane cho cluster HA

**Cấp độ 7 · Vận hành cluster** · khoảng 60 phút · môi trường: kubeadm trên máy ảo

Năng lực CKA: Cluster Architecture › Control plane high-availability; Cluster Architecture › Tạo và quản lý cluster bằng kubeadm

Mức hỗ trợ: **Tự lực**. Đề bài kiểu phòng thi. Phần này chỉ đưa quy trình làm việc và cách kiểm chứng; chi tiết bạn tự tra như trong phòng thi.

## Mục tiêu

Biến cluster một control plane thành ba control plane với etcd xếp chồng (stacked), hiểu vai trò của endpoint chung và load balancer.

## Cần làm trước

- [Lab 30 · Nâng cấp cluster kubeadm 1.34 → 1.35](../30-kubeadm-upgrade/README.md)

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

## Quy trình tư duy

### Quy trình

1. **Điều kiện tiên quyết.** Cluster được init với `--control-plane-endpoint` (lab 01), và node mới đã chuẩn bị như worker (runtime, gói kube*).
2. **Chứng chỉ dùng chung.** Control plane mới cần CA và khóa của cluster. `--upload-certs` đẩy chúng lên Secret tạm (hết hạn sau 2 giờ) và trả về certificate key.
3. **Lệnh join** cho control plane = lệnh join của worker + `--control-plane --certificate-key <key>` + địa chỉ quảng bá của node mới.
4. Join **lần lượt** từng node, chờ node trước Ready rồi mới làm node sau. etcd thêm member từng cái một.

### Kiểm chứng

- `kubectl get nodes` có 3 node `control-plane`.
- `etcdctl member list` (chạy trong Pod etcd, với các cờ TLS) có 3 member `started`.
- Leader election: `kubectl get lease -n kube-system`. Trường `holderIdentity` cho biết node nào đang giữ.

### Liên hệ thực tế

Ba control plane chịu được mất **một** node: etcd cần quá bán số member (2/3). Hai control plane không tốt hơn một: mất một node là etcd mất quorum.

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
