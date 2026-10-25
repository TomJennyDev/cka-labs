# Lab 01 · Cài cluster bằng kubeadm trên máy ảo

**Cấp độ 0 · Chuẩn bị môi trường** · khoảng 60 phút · môi trường: kubeadm trên máy ảo

Năng lực CKA: Cluster Architecture › Chuẩn bị hạ tầng để cài cluster; Cluster Architecture › Tạo và quản lý cluster bằng kubeadm; Cluster Architecture › Interface mở rộng: CNI, CSI, CRI

Mức hỗ trợ: **Cầm tay chỉ việc**. Mỗi bước có lệnh, giải thích vì sao và kết quả bạn sẽ thấy. Lần đầu làm theo từng bước; lần hai đóng phần hướng dẫn lại và tự làm đề bài.

## Mục tiêu

Tự tay dựng cluster kubeadm 3 node: chuẩn bị node, `kubeadm init`, cài CNI, join worker. Đây là năng lực "Prepare underlying infrastructure" và "Create and manage clusters using kubeadm" của đề thi.

## Cần làm trước

- [Lab 00 · Dựng cluster lab và làm quen công cụ](../00-lab-environment/README.md)

## Kiến thức cần nắm

- Mỗi node cần: tắt swap, module `overlay` và `br_netfilter`, sysctl `net.ipv4.ip_forward=1`, container runtime (containerd với `SystemdCgroup = true`), và 3 gói `kubeadm kubelet kubectl` cùng phiên bản, được `apt-mark hold`.
- `kubeadm init` sinh chứng chỉ trong `/etc/kubernetes/pki`, kubeconfig trong `/etc/kubernetes/*.conf`, static pod trong `/etc/kubernetes/manifests`, rồi in lệnh `kubeadm join`.
- Node chỉ `Ready` khi đã có CNI. Lab này dùng Calico vì nó hỗ trợ NetworkPolicy.
- `--control-plane-endpoint k8s-api:6443` đặt tên chung cho API server, để sau này thêm control plane thứ hai (lab 32).

## Chuẩn bị

```bash
./lab start 1
```

Lab này không dùng `./lab start`. Dựng 3 máy ảo trước:
```bash
cd env/kubeadm && vagrant up      # cp-1, worker-1, worker-2 với Kubernetes v1.34
vagrant ssh cp-1
```
`prepare-node.sh` đã chuẩn bị sẵn từng node (swap, module, sysctl, containerd, các gói kube*). Hãy đọc file đó: đề thi có thể yêu cầu bạn tự làm từng bước.

## Đề bài

1. Trên `cp-1`, kiểm tra node đã sẵn sàng: `swapon --show` trống, `sysctl net.ipv4.ip_forward` bằng 1, `systemctl is-active containerd` là active, `kubeadm version`.

2. Khởi tạo control plane với: endpoint `k8s-api:6443`, pod CIDR `10.244.0.0/16`, địa chỉ quảng bá `192.168.56.10`, và tải cert lên để join control plane sau này.

3. Cấu hình kubectl cho user `vagrant`.

4. Cài Calico v3.32.2 với pool IP `10.244.0.0/16`.

5. Join `worker-1` và `worker-2`. Chờ cả 3 node `Ready`.

6. Clone repo này trên `cp-1` và chạy `./lab check 1`.

## Hướng dẫn từng bước

### Bước 1 · Kiểm tra node đã được chuẩn bị

Trước `kubeadm init`, mọi node phải đạt 4 điều kiện. Đề thi có thể bắt bạn tự làm từng điều kiện, nên hãy đọc `env/kubeadm/prepare-node.sh` để biết mỗi điều kiện ứng với lệnh nào.

```bash
vagrant ssh cp-1
swapon --show                                  # không in gì = đã tắt swap
lsmod | grep -E 'overlay|br_netfilter'
sysctl net.ipv4.ip_forward                     # = 1
systemctl is-active containerd                 # active
grep SystemdCgroup /etc/containerd/config.toml # = true
kubeadm version -o short
```

> **Kết quả:** tất cả đúng như chú thích. Nếu `SystemdCgroup = false`, kubelet và containerd dùng hai cgroup driver khác nhau và Pod sẽ restart liên tục.

### Bước 2 · Khởi tạo control plane

Mỗi cờ có lý do:

- `--control-plane-endpoint k8s-api:6443` là tên chung cho API server (có trong `/etc/hosts`), để lab 32 thêm control plane thứ hai mà không phải cấp lại chứng chỉ.
- `--pod-network-cidr` phải khớp pool IP của CNI.
- `--apiserver-advertise-address` chọn card mạng host-only, không dùng card NAT của Vagrant.
- `--upload-certs` đẩy chứng chỉ lên Secret để control plane khác join được.

```bash
sudo kubeadm init --control-plane-endpoint k8s-api:6443 \
  --pod-network-cidr 10.244.0.0/16 \
  --apiserver-advertise-address 192.168.56.10 --upload-certs | tee ~/init.log
```

> **Kết quả:** dòng `Your Kubernetes control-plane has initialized successfully!` và hai lệnh `kubeadm join` (một cho control plane, một cho worker).

### Bước 3 · Cấu hình kubectl

`admin.conf` chứa chứng chỉ quyền cao nhất cluster. Chép nó cho user thường dùng.

```bash
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
kubectl get nodes
```

> **Kết quả:** `cp-1   NotReady`. NotReady là đúng: chưa có CNI nên kubelet báo mạng Pod chưa sẵn sàng.

### Bước 4 · Cài CNI Calico

CNI cấp IP cho Pod và nối mạng giữa các node. Pool IP của Calico phải trùng `--pod-network-cidr`.

```bash
curl -LO https://raw.githubusercontent.com/projectcalico/calico/v3.32.2/manifests/calico.yaml
grep -n -A1 CALICO_IPV4POOL_CIDR calico.yaml        # xem 2 dòng đang bị comment
sed -i 's|# - name: CALICO_IPV4POOL_CIDR|- name: CALICO_IPV4POOL_CIDR|; s|#   value: "192.168.0.0/16"|  value: "10.244.0.0/16"|' calico.yaml
kubectl apply -f calico.yaml
kubectl get pods -n kube-system -w                  # chờ calico-node Running, Ctrl+C để thoát
```

> **Kết quả:** sau 1–2 phút `kubectl get nodes` báo `cp-1 Ready`.

### Bước 5 · Join hai worker

Token trong `init.log` hết hạn sau 24 giờ. Lệnh dưới luôn in ra một lệnh join mới.

```bash
JOIN=$(kubeadm token create --print-join-command)
echo "$JOIN"
ssh worker-1 "sudo $JOIN"
ssh worker-2 "sudo $JOIN"
kubectl get nodes -w
```

> **Kết quả:** 3 node `Ready`. Worker chưa có ROLES, đó là bình thường.

### Bước 6 · Chấm bài

```bash
git clone https://github.com/TomJennyDev/cka-labs && cd cka-labs
./lab check 1
```

## Gợi ý

<details><summary>Lệnh init</summary>

`kubeadm init --control-plane-endpoint ... --pod-network-cidr ... --apiserver-advertise-address ... --upload-certs`

</details>

<details><summary>Mất lệnh join?</summary>

`kubeadm token create --print-join-command`

</details>

<details><summary>Calico manifest</summary>

Tải `calico.yaml`, bỏ comment biến `CALICO_IPV4POOL_CIDR` và đặt giá trị `10.244.0.0/16` trước khi apply.

</details>

## Chấm bài

```bash
./lab check 1
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 1
```

## Tài liệu

- [Creating a cluster with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
- [Container runtimes](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)

---

← [Lab 00 · Dựng cluster lab và làm quen công cụ](../00-lab-environment/README.md) · [Lab 02 · kubectl, namespace, context và Kubernetes API](../02-kubectl-api/README.md) →
