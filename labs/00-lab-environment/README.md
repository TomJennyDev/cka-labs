# Lab 00 · Dựng cluster lab và làm quen công cụ

**Cấp độ 0 · Chuẩn bị môi trường** · khoảng 30 phút · môi trường: kind hoặc kubeadm

## Mục tiêu

Có một cluster 3 node (1 control plane, 2 worker) chạy Kubernetes v1.35 để làm mọi bài lab, cấu hình terminal giống phòng thi và biết cách dùng `./lab`.

## Kiến thức cần nắm

- **kind** (Kubernetes in Docker) dựng mỗi node thành một container. Bên trong là kubeadm, kubelet chạy bằng systemd và control plane dạng static pod, giống hệt cluster thật. Gần như mọi lab chạy trên kind.
- **Cluster kubeadm trên máy ảo** (thư mục `env/kubeadm`) chỉ cần cho các bài cài đặt, nâng cấp và HA (lab 01, 30, 32).
- `./lab start <id>` dựng tình huống, `./lab check <id>` chấm bài, `./lab reset <id>` dọn dẹp.
- Một số bài yêu cầu ghi đáp án ra file. Thư mục đáp án mặc định là `~/cka-answers`; đổi bằng biến `CKA_ANSWERS`.
- Trong bài, `$CP`, `$NODE1`, `$NODE2` là tên node control plane và hai worker. Nạp chúng bằng `eval "$(./lab env)"`. Với kind, tên là `cka-control-plane`, `cka-worker`, `cka-worker2`.

## Chuẩn bị

```bash
./lab start 0
```

## Đề bài

1. Cài Docker, [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) v0.33+ và kubectl v1.35, rồi dựng cluster:
   ```bash
   ./env/kind/up.sh
   ```

2. Cấu hình shell giống phòng thi. Thêm vào `~/.bashrc` rồi `source ~/.bashrc`:
   ```bash
   alias k=kubectl
   source <(kubectl completion bash)
   complete -o default -F __start_kubectl k
   export do="--dry-run=client -o yaml"
   export now="--force --grace-period 0"
   ```

3. Chạy `./lab doctor` và `eval "$(./lab env)"`. Ghi tên node control plane vào `~/cka-answers/00-cp.txt`.

4. Ghi phiên bản kubelet của `$NODE1` (ví dụ `v1.35.8`) vào `~/cka-answers/00-kubelet.txt`. Lấy từ `kubectl get node`, không gõ tay.

5. Vào shell của `$NODE1` bằng `./lab ssh $NODE1`, chạy `crictl ps` để thấy container trên node, rồi `exit`.

## Gợi ý

<details><summary>Lấy phiên bản kubelet</summary>

`kubectl get node $NODE1 -o jsonpath='{.status.nodeInfo.kubeletVersion}'`

</details>

<details><summary>Máy dùng chip Apple</summary>

kind tự chọn image arm64. Cần Docker Desktop hoặc OrbStack với ít nhất 4 CPU và 6 GB RAM.

</details>

## Chấm bài

```bash
./lab check 0
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 0
```

## Tài liệu

- [kind quick start](https://kind.sigs.k8s.io/docs/user/quick-start/)
- [kubectl cheat sheet](https://kubernetes.io/docs/reference/kubectl/quick-reference/)

---

[Lab 01 · Cài cluster bằng kubeadm trên máy ảo](../01-kubeadm-install/README.md) →
