# Lab 04 · Sinh YAML nhanh và trích xuất bằng jsonpath

**Cấp độ 1 · Nền tảng kubectl** · khoảng 25 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Troubleshooting › Theo dõi tài nguyên cluster và ứng dụng

Mức hỗ trợ: **Cầm tay chỉ việc**. Mỗi bước có lệnh, giải thích vì sao và kết quả bạn sẽ thấy. Lần đầu làm theo từng bước; lần hai đóng phần hướng dẫn lại và tự làm đề bài.

## Mục tiêu

Viết YAML bằng `--dry-run=client -o yaml` thay vì gõ tay, và trích đúng dữ liệu đề yêu cầu bằng jsonpath, custom-columns, sort-by.

## Cần làm trước

- [Lab 03 · Pod, label, log và exec](../03-pods/README.md)

## Kiến thức cần nắm

- `kubectl create deploy … $do > file.yaml` cho khung YAML đúng cú pháp; chỉ cần sửa phần còn thiếu.
- jsonpath: `{.items[*].metadata.name}` lấy danh sách; `{range .items[*]}{.a} {.b}{"\n"}{end}` in từng dòng; `[?(@.type=="InternalIP")]` lọc phần tử.
- `-o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[*].image` in bảng theo ý muốn; `--sort-by=.metadata.name` sắp xếp.

## Chuẩn bị

```bash
./lab start 4
```

## Đề bài

1. Sinh YAML Deployment `api` (image `nginx:1.27`, 2 replica) bằng dry-run, lưu vào `~/cka-answers/04-api.yaml`. Sửa file để Pod template có thêm label `tier=backend`, rồi apply vào namespace `lab04`.

2. Ghi vào `~/cka-answers/04-pod-ips.txt` mỗi dòng một Pod trong `lab04` theo dạng `<tên> <podIP>`.

3. Ghi InternalIP của mọi node vào `~/cka-answers/04-node-ips.txt`, cách nhau bởi dấu cách, trên một dòng.

4. Ghi vào `~/cka-answers/04-images.txt` bảng hai cột `POD` và `IMAGE` của các Pod trong `lab04`, sắp xếp theo tên Pod.

## Hướng dẫn từng bước

### Bước 1 · Sinh YAML thay vì viết từ đầu

Trong phòng thi gần như không ai gõ YAML từ con số 0. Quy trình chuẩn: `create … $do > file`, sửa file, rồi `apply`.

```bash
./lab start 4
kubectl create deploy api --image=nginx:1.27 --replicas=2 $do > ~/cka-answers/04-api.yaml
cat ~/cka-answers/04-api.yaml
```

> **Kết quả:** một Deployment có `metadata`, `spec.selector`, `spec.template` và trường thừa `creationTimestamp: null`, `status: {}` (để nguyên cũng không sao).

### Bước 2 · Sửa Pod template

Deployment có hai chỗ chứa label. `spec.selector.matchLabels` chọn Pod và **không đổi được** sau khi tạo. `spec.template.metadata.labels` là label của Pod; label mới thêm vào chỗ này. Selector phải là tập con của label template.

```bash
vi ~/cka-answers/04-api.yaml
```
```yaml
  template:
    metadata:
      labels:
        app: api
        tier: backend      # thêm dòng này
```
```bash
kubectl apply -n lab04 -f ~/cka-answers/04-api.yaml
kubectl get pods -n lab04 -l tier=backend
```

> **Kết quả:** 2 Pod `api-…` Running có label `tier=backend`.

Tra nhanh tên trường bằng `kubectl explain deploy.spec.template.metadata` hoặc `kubectl explain pod.spec --recursive | less`.

### Bước 3 · jsonpath với range

`{range .items[*]}…{end}` lặp qua từng phần tử, `{"\n"}` xuống dòng. Hãy thử từng phần trước khi ghi file.

```bash
kubectl get pods -n lab04 -o jsonpath='{.items[*].metadata.name}'; echo
kubectl get pods -n lab04 -o jsonpath='{range .items[*]}{.metadata.name} {.status.podIP}{"\n"}{end}'
kubectl get pods -n lab04 -o jsonpath='{range .items[*]}{.metadata.name} {.status.podIP}{"\n"}{end}' > ~/cka-answers/04-pod-ips.txt
```

> **Kết quả:** 3 dòng (`cache` và 2 Pod `api`), mỗi dòng `tên IP`.

### Bước 4 · Lọc mảng bằng điều kiện

`status.addresses` của node là một mảng gồm nhiều loại địa chỉ. `[?(@.type=="InternalIP")]` chỉ giữ phần tử thỏa điều kiện.

```bash
kubectl get node "$NODE1" -o jsonpath='{.status.addresses}'; echo
kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}' > ~/cka-answers/04-node-ips.txt
cat ~/cka-answers/04-node-ips.txt
```

> **Kết quả:** 3 IP trên một dòng, cách nhau dấu cách.

### Bước 5 · Bảng tùy biến và sắp xếp

`custom-columns=TIÊU_ĐỀ:đường.dẫn,…` dựng bảng theo ý bạn. `--sort-by` nhận một đường dẫn jsonpath.

```bash
kubectl get pods -n lab04 --sort-by=.metadata.name \
  -o custom-columns=POD:.metadata.name,IMAGE:.spec.containers[*].image > ~/cka-answers/04-images.txt
cat ~/cka-answers/04-images.txt
```

> **Kết quả:** tiêu đề `POD  IMAGE`, rồi 3 dòng xếp theo tên.

### Bước 6 · Chấm bài

```bash
./lab check 4
```

## Gợi ý

<details><summary>Một dòng cho mỗi Pod</summary>

`kubectl get pods -n lab04 -o jsonpath='{range .items[*]}{.metadata.name} {.status.podIP}{"\n"}{end}'`

</details>

<details><summary>Lọc theo type</summary>

`{.items[*].status.addresses[?(@.type=="InternalIP")].address}`

</details>

## Chấm bài

```bash
./lab check 4
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 4
```

## Tài liệu

- [JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)

---

← [Lab 03 · Pod, label, log và exec](../03-pods/README.md) · [Lab 05 · Deployment: scale, rolling update, rollback](../05-deployment-rollout/README.md) →
