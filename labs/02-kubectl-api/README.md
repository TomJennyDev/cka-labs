# Lab 02 · kubectl, namespace, context và Kubernetes API

**Cấp độ 1 · Nền tảng kubectl** · khoảng 20 phút · môi trường: kind hoặc kubeadm

## Mục tiêu

Thao tác nhanh với namespace và context, tra cứu API bằng `api-resources` và `explain`, đọc trạng thái cluster mà không cần mở tài liệu.

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
