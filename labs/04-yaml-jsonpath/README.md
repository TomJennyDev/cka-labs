# Lab 04 · Sinh YAML nhanh và trích xuất bằng jsonpath

**Cấp độ 1 · Nền tảng kubectl** · khoảng 25 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Troubleshooting › Theo dõi tài nguyên cluster và ứng dụng

## Mục tiêu

Viết YAML bằng `--dry-run=client -o yaml` thay vì gõ tay, và trích đúng dữ liệu đề yêu cầu bằng jsonpath, custom-columns, sort-by.

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
