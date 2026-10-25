# Lab 02 · kubectl, namespace, context và Kubernetes API

**Cấp độ 1 · Nền tảng kubectl** · khoảng 20 phút · môi trường: kind hoặc kubeadm

Mức hỗ trợ: **Cầm tay chỉ việc**. Mỗi bước có lệnh, giải thích vì sao và kết quả bạn sẽ thấy. Lần đầu làm theo từng bước; lần hai đóng phần hướng dẫn lại và tự làm đề bài.

## Mục tiêu

Thao tác nhanh với namespace và context, tra cứu API bằng `api-resources` và `explain`, đọc trạng thái cluster mà không cần mở tài liệu.

## Cần làm trước

- [Lab 00 · Dựng cluster lab và làm quen công cụ](../00-lab-environment/README.md)

## Kiến thức cần nắm

- Mọi object có `apiVersion`, `kind`, `metadata`, `spec`, `status`. Deployment thuộc group `apps`, version `v1`; Pod thuộc core group nên chỉ ghi `v1`.
- Một số resource thuộc namespace (Pod, Service), một số thuộc cả cluster (Node, PersistentVolume, ClusterRole). `kubectl api-resources --namespaced=false` liệt kê nhóm sau.
- Context = cluster + user + namespace mặc định. Mỗi câu thi bắt đầu bằng `kubectl config use-context …`.
- `kubectl explain pod.spec.containers --recursive` là cách nhanh nhất để nhớ tên field.

## Chuẩn bị

```bash
./lab start 2
```

## Đề bài

1. Tạo namespace `lab02` có label `team=blue`.

2. Tạo context `lab02-ctx` dùng cùng cluster và user với context hiện tại, namespace mặc định `lab02`. **Không** chuyển sang context đó.

3. Ghi `apiVersion` của CronJob (ví dụ dạng `group/version`) vào `~/cka-answers/02-cronjob-api.txt`.

4. Ghi **số lượng** loại resource cluster-scoped mà cluster hỗ trợ vào `~/cka-answers/02-cluster-scoped.txt`.

5. Namespace `lab02-apps` (đã tạo sẵn) có nhiều Pod. Ghi tên Pod có label `tier=db` vào `~/cka-answers/02-db-pod.txt`, và tên node nó đang chạy vào `~/cka-answers/02-db-node.txt`.

## Hướng dẫn từng bước

### Bước 1 · Tạo namespace rồi gắn label

Namespace là "thư mục" chứa object. Lệnh `create` tạo object, lệnh `label` gắn nhãn vào object đã có.

```bash
./lab start 2
kubectl create ns lab02
kubectl label ns lab02 team=blue
kubectl get ns lab02 --show-labels
```

> **Kết quả:** cột LABELS có `team=blue` (cùng label tự động `kubernetes.io/metadata.name=lab02`).

### Bước 2 · Hiểu kubeconfig: cluster, user, context

File `~/.kube/config` có 3 danh sách. **cluster** là địa chỉ API và CA, **user** là chứng chỉ hoặc token, còn **context** là một cặp cluster + user + namespace mặc định. `--minify` chỉ in phần của context hiện tại.

```bash
kubectl config get-contexts
kubectl config view --minify
```

> **Kết quả:** dấu `*` đánh dấu context đang dùng; thấy tên cluster và tên user của nó.

### Bước 3 · Tạo context mới mà không chuyển sang

Lấy tên cluster và user bằng jsonpath để khỏi gõ sai. `set-context` chỉ thêm hoặc sửa context, không đổi context hiện tại. Lệnh chuyển là `use-context`, và bài này **không** dùng nó.

```bash
CL=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')
US=$(kubectl config view --minify -o jsonpath='{.users[0].name}')
kubectl config set-context lab02-ctx --cluster="$CL" --user="$US" --namespace=lab02
kubectl config get-contexts
```

> **Kết quả:** có dòng `lab02-ctx`, dấu `*` vẫn nằm ở context cũ.

Trong phòng thi, **mỗi câu** bắt đầu bằng một lệnh `kubectl config use-context …`. Luôn chạy lệnh đó trước khi làm.

### Bước 4 · Khám phá API bằng api-resources

`api-resources` liệt kê mọi loại object cluster hỗ trợ: tên, tên tắt, API group/version, có thuộc namespace không. Đây là cách nhanh nhất để biết `apiVersion` cần ghi trong YAML.

```bash
kubectl api-resources | head
kubectl api-resources | grep -i cronjob
echo batch/v1 > ~/cka-answers/02-cronjob-api.txt
```

> **Kết quả:** `cronjobs  cj  batch/v1  true  CronJob`: tên tắt `cj`, apiVersion `batch/v1`, `true` là có namespace.

### Bước 5 · Đếm resource cluster-scoped

Object không thuộc namespace nào (Node, PV, ClusterRole…) gọi là cluster-scoped. `--no-headers` bỏ dòng tiêu đề để `wc -l` đếm đúng.

```bash
kubectl api-resources --namespaced=false
kubectl api-resources --namespaced=false --no-headers | wc -l > ~/cka-answers/02-cluster-scoped.txt
```

### Bước 6 · Lọc Pod theo label và xem node

`-l` lọc theo label, `-o wide` thêm cột IP và NODE. Khi đã tìm được, dùng jsonpath để ghi đúng một giá trị.

```bash
kubectl get pods -n lab02-apps --show-labels
kubectl get pods -n lab02-apps -l tier=db -o wide
kubectl get pods -n lab02-apps -l tier=db -o jsonpath='{.items[0].metadata.name}' > ~/cka-answers/02-db-pod.txt
kubectl get pods -n lab02-apps -l tier=db -o jsonpath='{.items[0].spec.nodeName}' > ~/cka-answers/02-db-node.txt
```

> **Kết quả:** đúng một Pod tên `pg-…`. Kết quả `get` nhiều object là một List, nên jsonpath bắt đầu bằng `.items[0]`.

### Bước 7 · Chấm bài

```bash
./lab check 2
```

## Gợi ý

<details><summary>Tạo context</summary>

`kubectl config set-context lab02-ctx --cluster=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}') --user=... --namespace=lab02`

</details>

<details><summary>Đếm resource</summary>

`kubectl api-resources --namespaced=false --no-headers | wc -l`

</details>

## Chấm bài

```bash
./lab check 2
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 2
```

## Tài liệu

- [Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)
- [Organizing access with kubeconfig](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)

---

← [Lab 01 · Cài cluster bằng kubeadm trên máy ảo](../01-kubeadm-install/README.md) · [Lab 03 · Pod, label, log và exec](../03-pods/README.md) →
