# Lab 07 · Liveness, readiness và startup probe

**Cấp độ 2 · Workloads** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Workloads & Scheduling › Primitive cho ứng dụng tự phục hồi; Troubleshooting › Quản lý và đánh giá output, log của container

## Mục tiêu

Chẩn đoán một ứng dụng bị kubelet giết liên tục vì probe sai, sửa bằng startupProbe, và thêm readiness để Service chỉ gửi traffic khi Pod sẵn sàng.

## Kiến thức cần nắm

- **liveness** trượt `failureThreshold` lần liên tiếp thì kubelet giết container. **readiness** trượt chỉ rút Pod khỏi EndpointSlice, không restart. **startup** chặn hai probe kia cho tới khi app khởi động xong; thời gian tối đa = `failureThreshold × periodSeconds`.
- Kiểu probe: `httpGet` (mã 200–399), `tcpSocket`, `exec` (thoát 0), `grpc`. Mặc định `periodSeconds: 10`, `timeoutSeconds: 1`, `failureThreshold: 3`.
- Dấu hiệu probe sai: event `Unhealthy` và `Killing`, RESTARTS tăng dần, `READY 0/1` dù `STATUS Running`.

## Chuẩn bị

```bash
./lab start 7
```

## Đề bài

1. Deployment `slow-api` trong `lab07` cần khoảng **25 giây** để khởi động và restart liên tục. Tìm probe nào gây restart, ghi tên probe (`liveness`, `readiness` hoặc `startup`) vào `~/cka-answers/07-culprit.txt`.

2. Sửa `slow-api` mà **không** tăng `initialDelaySeconds` của liveness: thêm `startupProbe` HTTP `GET /healthz` cổng 8080, cho phép tối đa ít nhất 60 giây để khởi động.

3. Readiness của `slow-api` đang trỏ sai cổng. Sửa để nó kiểm tra `GET /ready` cổng 8080. Cả 2 Pod phải `READY 1/1` và không restart nữa.

4. Deployment `cache` chưa có readiness. Thêm `readinessProbe` kiểu `exec` chạy `cat /tmp/ready`, chu kỳ 5 giây.

## Gợi ý

<details><summary>Xem probe nào đang trượt</summary>

`kubectl describe pod -n lab07 -l app=slow-api | grep -E 'Liveness|Readiness|Startup|Killing'`

</details>

<details><summary>Sửa nhanh</summary>

`kubectl edit deploy slow-api -n lab07`. Thêm `startupProbe` ngang hàng với `livenessProbe`.

</details>

## Chấm bài

```bash
./lab check 7
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 7
```

## Tài liệu

- [Configure liveness, readiness and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)

---

← [Lab 06 · ConfigMap và Secret](../06-configmap-secret/README.md) · [Lab 08 · Init container và sidecar container](../08-init-sidecar/README.md) →
