# Lab 06 · ConfigMap và Secret

**Cấp độ 2 · Workloads** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Workloads & Scheduling › ConfigMap và Secret

Mức hỗ trợ: **Cầm tay chỉ việc**. Mỗi bước có lệnh, giải thích vì sao và kết quả bạn sẽ thấy. Lần đầu làm theo từng bước; lần hai đóng phần hướng dẫn lại và tự làm đề bài.

## Mục tiêu

Tách cấu hình khỏi image: tạo ConfigMap và Secret từ literal và file, đưa vào container qua biến môi trường và volume, đọc giá trị Secret có sẵn.

## Cần làm trước

- [Lab 05 · Deployment: scale, rolling update, rollback](../05-deployment-rollout/README.md)

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

## Hướng dẫn từng bước

### Bước 1 · ConfigMap từ literal

Mỗi `--from-literal` tạo một key. ConfigMap chứa cấu hình không bí mật.

```bash
./lab start 6
kubectl create cm app-config -n lab06 --from-literal=APP_MODE=production --from-literal=APP_PORT=8080
kubectl get cm app-config -n lab06 -o yaml
```

> **Kết quả:** khối `data:` có 2 key.

### Bước 2 · ConfigMap từ file

`--from-file=<key>=<đường dẫn>` lấy cả nội dung file làm giá trị của key. Bỏ phần `<key>=` thì tên file thành key.

```bash
cat ~/cka-answers/06-app.properties
kubectl create cm app-files -n lab06 --from-file=app.properties=$HOME/cka-answers/06-app.properties
kubectl describe cm app-files -n lab06
```

### Bước 3 · Secret và base64

Secret `generic` lưu giá trị dạng **base64**. Đây chỉ là mã hóa, **không** phải mật mã: ai đọc được Secret thì giải mã được. Quyền đọc Secret phải được giới hạn bằng RBAC (lab 23).

```bash
kubectl create secret generic db-cred -n lab06 --from-literal=username=admin --from-literal=password=S3cr3t-pass
kubectl get secret db-cred -n lab06 -o jsonpath='{.data.password}'; echo          # UzNjcjN0LXBhc3M=
kubectl get secret db-cred -n lab06 -o jsonpath='{.data.password}' | base64 -d; echo
```

### Bước 4 · Giải mã Secret có sẵn

```bash
kubectl get secret legacy-token -n lab06 -o jsonpath='{.data.token}' | base64 -d > ~/cka-answers/06-token.txt
cat ~/cka-answers/06-token.txt
```

> **Kết quả:** chuỗi dạng `tok-12345…`, không có dấu xuống dòng thừa.

### Bước 5 · Dùng cấu hình trong Deployment

Có ba cách đưa dữ liệu vào container:

- `envFrom.configMapRef`: mọi key thành biến môi trường.
- `env[].valueFrom.secretKeyRef`: một key thành một biến.
- `volumes[].configMap` + `volumeMounts`: mỗi key thành một file.

Sinh khung rồi thêm 3 khối đó:

```bash
kubectl create deploy app -n lab06 --image=busybox:1.36 $do -- sleep 3600 > app.yaml
vi app.yaml
```
```yaml
      containers:
      - name: busybox
        image: busybox:1.36
        command: ["sleep", "3600"]
        envFrom:
        - configMapRef: {name: app-config}
        env:
        - name: DB_PASSWORD
          valueFrom: {secretKeyRef: {name: db-cred, key: password}}
        volumeMounts:
        - {name: files, mountPath: /etc/app, readOnly: true}
      volumes:
      - name: files
        configMap: {name: app-files}
```
```bash
kubectl apply -f app.yaml
```

`volumes` nằm ngang hàng với `containers`, còn `volumeMounts` nằm trong từng container. Đặt sai cấp là lỗi YAML hay gặp nhất.

### Bước 6 · Kiểm tra từ bên trong container

```bash
kubectl exec -n lab06 deploy/app -- sh -c 'env | grep -E "APP_|DB_"; ls /etc/app; cat /etc/app/app.properties'
./lab check 6
```

> **Kết quả:** thấy `APP_MODE`, `APP_PORT`, `DB_PASSWORD` và file `app.properties`. Biến môi trường chỉ đọc lúc container khởi động. File mount từ ConfigMap thì tự cập nhật sau khoảng một phút khi ConfigMap đổi (trừ khi dùng `subPath`).

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
