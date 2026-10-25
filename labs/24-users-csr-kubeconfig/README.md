# Lab 24 · User mới bằng chứng chỉ, CSR và kubeconfig

**Cấp độ 6 · Bảo mật** · khoảng 35 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Cluster Architecture › Quản lý RBAC

## Mục tiêu

Cấp quyền truy cập cho một lập trình viên từ đầu: tạo khóa và CSR, để cluster ký chứng chỉ, dựng kubeconfig riêng, phân quyền theo group, và thử đăng nhập.

## Kiến thức cần nắm

- Kubernetes không có object User. Với chứng chỉ client: **CN** là tên user, **O** là group.
- CertificateSigningRequest với `signerName: kubernetes.io/kube-apiserver-client` và `usages: [client auth]`; admin chạy `kubectl certificate approve`, chứng chỉ nằm ở `.status.certificate`.
- kubeconfig gồm `clusters` (server + CA), `users` (cert + key), `contexts` (ghép hai cái trên). `--embed-certs` nhúng nội dung vào file thay vì trỏ đường dẫn.
- Phân quyền cho **group** tiện hơn từng user: thêm người chỉ cần cấp cert có `O=<group>`.

## Chuẩn bị

```bash
./lab start 24
```

## Đề bài

1. Tạo khóa RSA 2048 và CSR cho user `dev1` thuộc group `developers`, lưu tại `~/cka-answers/dev1.key` và `~/cka-answers/dev1.csr`.

2. Gửi CertificateSigningRequest tên `dev1` (signer client của API server, hạn 1 ngày), duyệt nó, và lưu chứng chỉ vào `~/cka-answers/dev1.crt`.

3. Tạo file kubeconfig **riêng** `~/cka-answers/dev1.kubeconfig` (không sửa `~/.kube/config`) có cluster giống cluster hiện tại, user `dev1` với cert nhúng sẵn, context `dev1@lab` dùng namespace `lab24`, và đặt nó là context hiện tại trong file đó.

4. Group `developers` được `get, list, watch, create, delete` Pod và Deployment trong `lab24`, không gì khác.

5. Kiểm tra: dùng `--kubeconfig ~/cka-answers/dev1.kubeconfig`, tạo được Deployment `hello` (`nginx:1.27`) trong `lab24` nhưng **không** xem được node.

## Gợi ý

<details><summary>Tạo CSR với group</summary>

`openssl req -new -key dev1.key -subj "/CN=dev1/O=developers" -out dev1.csr`

</details>

<details><summary>Lấy server và CA của cluster hiện tại</summary>

`kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.server}'` và `…certificate-authority-data` (base64)

</details>

## Chấm bài

```bash
./lab check 24
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 24
```

## Tài liệu

- [Certificates and certificate signing requests](https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/)
- [Configure access to multiple clusters](https://kubernetes.io/docs/tasks/access-application-cluster/configure-access-multiple-clusters/)

---

← [Lab 23 · RBAC với Role, ClusterRole và ServiceAccount](../23-rbac/README.md) · [Lab 25 · securityContext và Pod Security Admission](../25-security-context-psa/README.md) →
