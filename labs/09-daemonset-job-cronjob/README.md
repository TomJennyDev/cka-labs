# Lab 09 · DaemonSet, Job và CronJob

**Cấp độ 2 · Workloads** · khoảng 30 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Workloads & Scheduling › Primitive cho ứng dụng tự phục hồi

## Mục tiêu

Chọn đúng loại workload: một Pod trên mỗi node (DaemonSet), tác vụ chạy tới khi xong (Job), tác vụ theo lịch (CronJob).

## Kiến thức cần nắm

- Không có `kubectl create daemonset`: sinh YAML Deployment rồi đổi `kind: DaemonSet`, bỏ `replicas` và `strategy`. Muốn chạy cả trên control plane phải tolerate taint `node-role.kubernetes.io/control-plane:NoSchedule`.
- Job: `completions` (cần bao nhiêu lần thành công), `parallelism` (chạy song song bao nhiêu), `backoffLimit` (số lần thử lại), `ttlSecondsAfterFinished` (tự xóa). `restartPolicy` chỉ được `Never` hoặc `OnFailure`.
- CronJob: `schedule` theo cú pháp cron, `concurrencyPolicy` (`Allow`, `Forbid`, `Replace`), giới hạn lịch sử job. `kubectl create job x --from=cronjob/y` chạy ngay một lần.

## Chuẩn bị

```bash
./lab start 9
```

## Đề bài

1. Trong `lab09`, tạo DaemonSet `node-agent` (image `busybox:1.36`, lệnh `sleep 3600`) chạy trên **mọi** node, kể cả control plane.

2. Tạo Job `batch-sum` (image `busybox:1.36`, lệnh `sh -c 'echo done'`) cần **4** lần thành công, chạy song song tối đa **2**, thử lại tối đa **2** lần, tự xóa sau **300** giây khi xong. Job phải hoàn thành.

3. Tạo CronJob `report` chạy mỗi 15 phút (image `busybox:1.36`, lệnh `date`), không cho chạy chồng (`Forbid`), giữ lại 2 job thành công.

4. Chạy ngay một lần CronJob `report` bằng Job tên `report-now`. Job phải hoàn thành.

## Gợi ý

<details><summary>Sinh YAML Job và CronJob</summary>

`kubectl create job batch-sum --image=busybox:1.36 $do -- sh -c 'echo done'` và `kubectl create cronjob report --image=busybox:1.36 --schedule='*/15 * * * *' $do -- date`

</details>

## Chấm bài

```bash
./lab check 9
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 9
```

## Tài liệu

- [DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [CronJob](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)

---

← [Lab 08 · Init container và sidecar container](../08-init-sidecar/README.md) · [Lab 10 · Requests, limits, LimitRange và ResourceQuota](../10-resources-quota/README.md) →
