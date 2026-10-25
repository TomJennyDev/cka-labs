# Lab 37 · Theo dõi tài nguyên, event và log

**Cấp độ 8 · Troubleshooting** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Troubleshooting › Theo dõi tài nguyên cluster và ứng dụng; Troubleshooting › Quản lý và đánh giá output, log của container

Mức hỗ trợ: **Tự lực**. Đề bài kiểu phòng thi. Phần này chỉ đưa quy trình làm việc và cách kiểm chứng; chi tiết bạn tự tra như trong phòng thi.

## Mục tiêu

Trả lời nhanh các câu hỏi "cái gì đang ngốn CPU", "vì sao nó chết", "log lần trước nói gì" bằng `kubectl top`, event và log, và ghi đáp án ra file đúng định dạng.

## Cần làm trước

- [Lab 11 · metrics-server và HorizontalPodAutoscaler](../11-hpa-metrics/README.md)
- [Lab 33 · Troubleshooting ứng dụng: sáu Deployment hỏng](../33-troubleshoot-apps/README.md)

## Kiến thức cần nắm

- `kubectl top pod/node` cần metrics-server; `--sort-by=cpu|memory`, `--containers`, `-A`.
- `kubectl get events --sort-by=.lastTimestamp`, lọc `--field-selector involvedObject.name=<pod>,type=Warning`; hoặc `kubectl events --for pod/<tên>`.
- `kubectl logs`: `-c <container>`, `--previous`, `--since=10m`, `--tail=50`, `-l <selector> --all-containers --prefix`.
- Exit code và lý do: `.status.containerStatuses[*].lastState.terminated`.

## Chuẩn bị

```bash
./lab start 37
```

## Đề bài

1. Trong `lab37`, ghi tên Pod dùng **nhiều CPU nhất** vào `~/cka-answers/37-cpu.txt`.

2. Pod `crashy` đang khởi động lại liên tục. Ghi các dòng chứa `FATAL` trong log **lần chạy trước** vào `~/cka-answers/37-fatal.txt`, và exit code lần chết gần nhất vào `~/cka-answers/37-exit.txt`.

3. Pod `multi` có hai container. Đếm số dòng chứa `upstream timeout` trong log của container `proxy`, ghi vào `~/cka-answers/37-timeouts.txt`.

4. Ghi `reason` của event cảnh báo mới nhất liên quan tới `crashy` vào `~/cka-answers/37-event.txt`.

## Quy trình tư duy

### Quy trình

Mỗi câu hỏi ứng với một nguồn dữ liệu. Chọn đúng nguồn trước, rồi lọc bằng cờ có sẵn của kubectl trước khi dùng `grep`/`awk`.

| Câu hỏi | Nguồn |
|---|---|
| Ai dùng nhiều CPU/memory | `kubectl top` (`--sort-by`, `--containers`) |
| Container chết vì sao | `lastState.terminated` của `containerStatuses` (reason, exitCode) |
| Log trước khi restart | `kubectl logs --previous` |
| Log của một container trong nhiều | `kubectl logs -c` |
| Chuyện gì đã xảy ra với object | `kubectl events --for` hoặc `get events --field-selector`, sắp theo thời gian |

### Kiểm chứng

Mọi đáp án phải lấy bằng lệnh, đừng đếm bằng mắt. Chạy lại lệnh lần hai để chắc kết quả ổn định (số dòng log tăng theo thời gian).

## Gợi ý

<details><summary>Sắp xếp theo CPU</summary>

`kubectl top pod -n lab37 --sort-by=cpu --no-headers | head -1`

</details>

<details><summary>Event của một Pod</summary>

`kubectl get events -n lab37 --field-selector involvedObject.name=crashy,type=Warning --sort-by=.lastTimestamp`

</details>

## Chấm bài

```bash
./lab check 37
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 37
```

## Tài liệu

- [Resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)
- [Logging architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- [kubectl events](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)

---

← [Lab 36 · Troubleshooting node: worker NotReady](../36-troubleshoot-node/README.md) · [Lab 38 · Đề thi thử CKA (2 giờ, 16 câu)](../38-mock-exam/README.md) →
