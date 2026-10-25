# Lab 06 · ConfigMap và Secret

**Cấp độ 2 · Workloads** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Workloads & Scheduling › ConfigMap và Secret

## Mục tiêu

Tách cấu hình khỏi image: tạo ConfigMap và Secret từ literal và file, đưa vào container qua biến môi trường và volume, đọc giá trị Secret có sẵn.

## Kiến thức cần nắm

- `envFrom` nạp mọi key của ConfigMap/Secret thành biến môi trường; `env[].valueFrom.secretKeyRef` lấy một key.
- ConfigMap gắn qua volume: mỗi key thành một file. File tự cập nhật khi ConfigMap đổi (trừ khi dùng `subPath`); biến môi trường thì **không**, phải restart Pod.
- Secret chỉ được **base64**, không mã hóa. Đọc: `kubectl get secret x -o jsonpath='{.data.key}' | base64 -d`.

## Chuẩn bị

```bash
./lab start 6
```

## Đề bài

1. Trong namespace `lab06`, tạo ConfigMap `app-config` với `APP_MODE=production` và `APP_PORT=8080`.

2. Tạo ConfigMap `app-files` từ file `~/cka-answers/06-app.properties` (setup đã tạo sẵn), key là `app.properties`.

3. Tạo Secret `db-cred` với `username=admin` và `password=S3cr3t-pass`.

4. Tạo Deployment `app` (image `busybox:1.36`, lệnh `sleep 3600`) sao cho container có:
   mọi key của `app-config` thành biến môi trường; biến `DB_PASSWORD` lấy từ key `password` của `db-cred`; ConfigMap `app-files` gắn chỉ đọc tại `/etc/app`.

5. Secret `legacy-token` có sẵn. Giải mã key `token` và ghi giá trị vào `~/cka-answers/06-token.txt`.

## Gợi ý

<details><summary>Khung YAML</summary>

`kubectl create deploy app --image=busybox:1.36 $do -- sleep 3600 > app.yaml` rồi thêm `envFrom`, `env`, `volumes`, `volumeMounts`.

</details>

<details><summary>Thêm biến từ Secret bằng lệnh</summary>

`kubectl set env deploy/app --from=secret/db-cred --keys=password --prefix=DB_` tạo `DB_PASSWORD`.

</details>

## Chấm bài

```bash
./lab check 6
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 6
```

## Tài liệu

- [ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Configure a Pod to use a ConfigMap](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/)

---

← [Lab 05 · Deployment: scale, rolling update, rollback](../05-deployment-rollout/README.md) · [Lab 07 · Liveness, readiness và startup probe](../07-probes/README.md) →
