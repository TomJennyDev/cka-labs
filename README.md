# CKA Labs

Bộ **46 bài lab thực hành** để thi Certified Kubernetes Administrator (CKA), đi từ cơ bản tới nâng cao, phủ đủ **27 năng lực** trong 5 domain của curriculum CKA v1.37 (đề thi hiện chạy Kubernetes v1.37). Mỗi bài dựng sẵn tình huống trên cluster của bạn, có đề bài kiểu phòng thi, script **tự chấm**, gợi ý và lời giải. Cuối lộ trình là **hai đề thi thử 2 giờ** chấm điểm theo trọng số, ở chế độ phòng thi: mỗi câu ghi host phải `ssh` vào.

**Trang hướng dẫn:** [`docs/index.html`](docs/index.html) (bật GitHub Pages với thư mục `/docs` để xem online) gồm hai phần liên kết với nhau: **Lý thuyết** ([`docs/learn.html`](docs/learn.html): kiến trúc, luồng từ kubectl tới kernel, animation cơ chế, terminal mô phỏng, quiz) và **Lab thực hành** (lộ trình, từng bài, đồng hồ thi thử, lưu tiến độ trong trình duyệt). Mỗi bài lab có link tới phần lý thuyết liên quan.

```text
./lab start 7      # dựng tình huống
… tự làm theo labs/07-probes/README.md …
./lab check 7      # chấm bài
./lab reset 7      # dọn dẹp
```

## Bắt đầu nhanh

1. Cài [Docker](https://docs.docker.com/get-docker/), [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) ≥ v0.33 và [kubectl](https://kubernetes.io/docs/tasks/tools/) v1.37. Thêm `openssl` và (cho lab 26, 41) [Helm](https://helm.sh/docs/intro/install/). Lab 40–44 tải thêm thành phần từ internet (Calico, Argo CD chart, cert-manager, MetalLB, NGINX Gateway Fabric).
2. Clone repo và dựng cluster 3 node (1 control plane, 2 worker, Kubernetes v1.37.0):
   ```bash
   git clone https://github.com/TomJennyDev/cka-labs && cd cka-labs
   ./env/kind/up.sh
   ./lab doctor
   ```
3. Làm lần lượt từ `./lab start 0`.

Máy cần khoảng 4 CPU, 6 GB RAM trống, và Linux dùng cgroup v2 (mọi bản phân phối mới, Docker Desktop, OrbStack đều đạt).

## Hai môi trường

| Môi trường | Dùng cho | Cách dựng |
|---|---|---|
| **kind** (khuyên dùng) | 43/46 bài. kind dùng chính kubeadm: control plane là static pod, kubelet chạy bằng systemd, nên các bài vào node, static pod, etcd, sửa kubelet đều làm được. | `./env/kind/up.sh` |
| **kubeadm trên máy ảo** | Lab 01 (cài cluster), 30 (nâng cấp 1.36 → 1.37), 32 (control plane HA). | `cd env/kubeadm && vagrant up` rồi `vagrant ssh cp-1` |

Với VM, chạy `./lab` từ `cp-1`; script tự `ssh` sang các node khác (khóa SSH đã được Vagrant cài sẵn). Không dùng Vagrant thì chạy `env/kubeadm/prepare-node.sh` trên 3 máy Ubuntu bất kỳ.

## Lệnh `./lab`

| Lệnh | Việc |
|---|---|
| `./lab list` | Danh sách bài theo thứ tự |
| `./lab start <id>` | Dựng tình huống của bài |
| `./lab check <id>` | Chấm bài, in ✔/✘ từng tiêu chí |
| `./lab hint <id>` | Xem gợi ý |
| `./lab solution <id>` | Xem lời giải |
| `./lab reset <id>` | Dọn mọi thứ của bài (namespace, label, taint, file trên node) |
| `./lab env` | In `CP`, `NODE1`, `NODE2`; dùng `eval "$(./lab env)"` |
| `./lab ssh <node>` | Vào shell của node (`docker exec` với kind, `ssh` với VM) |
| `./lab doctor` | Kiểm tra công cụ và cluster |
| `./lab exam-hosts` | Cài kubectl, kubeconfig và `alias k` lên mọi node để luyện kiểu `ssh <host>` như phòng thi (đề thi thử tự bật) |

Bài nào yêu cầu ghi đáp án ra file thì ghi vào `~/cka-answers/` (đổi bằng biến `CKA_ANSWERS`).

## Lộ trình

| Cấp | Chủ đề | Lab |
|---|---|---|
| 0 | Chuẩn bị môi trường | 00–01 |
| 1 | Nền tảng kubectl | 02–04 |
| 2 | Workloads | 05–11 |
| 3 | Scheduling | 12–14 |
| 4 | Services & Networking | 15–19, 43–44 |
| 5 | Storage | 20–22 |
| 6 | Bảo mật | 23–25 |
| 7 | Vận hành cluster | 26–32, 39–42 |
| 8 | Troubleshooting | 33–37 |
| 9 | Thi thử | 38, 45 |

Mã bài là định danh cố định; thứ tự học đi theo **cấp độ**, nên lab 43–44 nằm trong cấp 4 và lab 39–42 nằm trong cấp 7. `./lab list` và trang hướng dẫn đều xếp theo thứ tự học.

### Bám đề thi hiện tại

- Curriculum CKA v1.37 (CNCF, 10/2026) giống hệt v1.35 về domain, trọng số và 27 năng lực; đề thi chạy Kubernetes **v1.37**, nên cluster lab dùng v1.37.0.
- Phòng thi: mỗi câu làm trên một host, `ssh <host>` rồi `sudo -i`. Hai đề thi thử ghi host cho từng câu và cài sẵn kubectl lên các node (`./lab exam-hosts`).
- Các dạng câu người thi gần đây kể lại có bài riêng: chuẩn bị node và cài container runtime (39), cài CNI bằng Tigera Operator (40), Helm từ repo/OCI và Argo CD (41), cài operator thật (42), Service LoadBalancer (43), chuyển Ingress sang Gateway API có HTTPS (44).

### Hướng dẫn giảm dần

Mức hướng dẫn trong mỗi bài giảm dần theo cấp độ, để bạn đi từ làm theo tới tự làm như trong phòng thi:

| Cấp | Mức hỗ trợ | Trong mỗi bài có |
|---|---|---|
| 0–2 (lab 00–11) | **Cầm tay chỉ việc** | *Hướng dẫn từng bước*: lệnh, giải thích vì sao, kết quả sẽ thấy |
| 3–6 (lab 12–25, 43–44) | **Dẫn hướng** | *Cách tiếp cận* cho từng câu: tra ở đâu, khung lệnh, cách tự kiểm, bẫy hay gặp. Không có đáp án |
| 7–9 (lab 26–42, 45) | **Tự lực** | *Quy trình tư duy*: cách làm việc và cách kiểm chứng, chi tiết tự tra như khi thi |

Mỗi bài có phần **Sơ đồ** (Mermaid): một sơ đồ cho biết lab dựng những gì và chúng nối với nhau ra sao, một sequence diagram cho thấy bên trong Kubernetes xử lý thế nào. Với bài troubleshooting, sơ đồ chỉ vẽ đường đi và các điểm cần kiểm tra, không lộ lỗi.

Mỗi bài cũng ghi **Cần làm trước** để bạn biết nên học bài nào trước. Gợi ý (`./lab hint`) và lời giải (`./lab solution`) luôn có cho mọi bài.

Gợi ý nhịp học 6 tuần: tuần 1 cấp 0–1, tuần 2 cấp 2, tuần 3 cấp 3–4, tuần 4 cấp 5–6, tuần 5 cấp 7–8, tuần 6 làm lại các bài sai và thi thử 2 lần.

## Danh sách bài

<!-- LABS:START -->
| Lab | Bài | Cấp độ | Môi trường | Thời gian |
|---|---|---|---|---|
| 00 | [Dựng cluster lab và làm quen công cụ](labs/00-lab-environment/README.md) | 0 · Chuẩn bị môi trường | kind hoặc kubeadm | 30′ |
| 01 | [Cài cluster bằng kubeadm trên máy ảo](labs/01-kubeadm-install/README.md) | 0 · Chuẩn bị môi trường | kubeadm trên máy ảo | 60′ |
| 02 | [kubectl, namespace, context và Kubernetes API](labs/02-kubectl-api/README.md) | 1 · Nền tảng kubectl | kind hoặc kubeadm | 20′ |
| 03 | [Pod, label, log và exec](labs/03-pods/README.md) | 1 · Nền tảng kubectl | kind hoặc kubeadm | 25′ |
| 04 | [Sinh YAML nhanh và trích xuất bằng jsonpath](labs/04-yaml-jsonpath/README.md) | 1 · Nền tảng kubectl | kind hoặc kubeadm | 25′ |
| 05 | [Deployment: scale, rolling update, rollback](labs/05-deployment-rollout/README.md) | 2 · Workloads | kind hoặc kubeadm | 30′ |
| 06 | [ConfigMap và Secret](labs/06-configmap-secret/README.md) | 2 · Workloads | kind hoặc kubeadm | 30′ |
| 07 | [Liveness, readiness và startup probe](labs/07-probes/README.md) | 2 · Workloads | kind hoặc kubeadm | 30′ |
| 08 | [Init container và sidecar container](labs/08-init-sidecar/README.md) | 2 · Workloads | kind hoặc kubeadm | 30′ |
| 09 | [DaemonSet, Job và CronJob](labs/09-daemonset-job-cronjob/README.md) | 2 · Workloads | kind hoặc kubeadm | 30′ |
| 10 | [Requests, limits, LimitRange và ResourceQuota](labs/10-resources-quota/README.md) | 2 · Workloads | kind hoặc kubeadm | 35′ |
| 11 | [metrics-server và HorizontalPodAutoscaler](labs/11-hpa-metrics/README.md) | 2 · Workloads | kind hoặc kubeadm | 30′ |
| 12 | [nodeSelector, node affinity, taint và toleration](labs/12-node-selection/README.md) | 3 · Scheduling | kind hoặc kubeadm | 30′ |
| 13 | [Anti-affinity, topology spread và PriorityClass](labs/13-spread-priority/README.md) | 3 · Scheduling | kind hoặc kubeadm | 30′ |
| 14 | [Static pod, lập lịch thủ công và bảo trì node](labs/14-static-pod-maintenance/README.md) | 3 · Scheduling | kind hoặc kubeadm (cần vào node) | 35′ |
| 15 | [Service, EndpointSlice và kết nối giữa các Pod](labs/15-services/README.md) | 4 · Services & Networking | kind hoặc kubeadm | 35′ |
| 16 | [DNS trong cluster và CoreDNS](labs/16-dns-coredns/README.md) | 4 · Services & Networking | kind hoặc kubeadm | 30′ |
| 17 | [NetworkPolicy theo mô hình mặc định chặn](labs/17-network-policy/README.md) | 4 · Services & Networking | kind hoặc kubeadm | 40′ |
| 18 | [Ingress, IngressClass và TLS](labs/18-ingress/README.md) | 4 · Services & Networking | kind hoặc kubeadm | 30′ |
| 19 | [Gateway API, HTTPRoute và ReferenceGrant](labs/19-gateway-api/README.md) | 4 · Services & Networking | kind hoặc kubeadm | 40′ |
| 43 | [Service LoadBalancer với MetalLB](labs/43-loadbalancer-metallb/README.md) | 4 · Services & Networking | kind hoặc kubeadm | 35′ |
| 44 | [Gateway API với controller thật - HTTPS và chuyển từ Ingress](labs/44-gateway-migrate-ingress/README.md) | 4 · Services & Networking | kind hoặc kubeadm | 40′ |
| 20 | [Volume: emptyDir, hostPath, projected và Downward API](labs/20-volumes/README.md) | 5 · Storage | kind hoặc kubeadm (cần vào node) | 30′ |
| 21 | [PersistentVolume, PVC và reclaim policy](labs/21-pv-pvc/README.md) | 5 · Storage | kind hoặc kubeadm | 30′ |
| 22 | [StorageClass, dynamic provisioning và StatefulSet](labs/22-storageclass-statefulset/README.md) | 5 · Storage | kind hoặc kubeadm | 35′ |
| 23 | [RBAC với Role, ClusterRole và ServiceAccount](labs/23-rbac/README.md) | 6 · Bảo mật | kind hoặc kubeadm | 35′ |
| 24 | [User mới bằng chứng chỉ, CSR và kubeconfig](labs/24-users-csr-kubeconfig/README.md) | 6 · Bảo mật | kind hoặc kubeadm | 35′ |
| 25 | [securityContext và Pod Security Admission](labs/25-security-context-psa/README.md) | 6 · Bảo mật | kind hoặc kubeadm | 30′ |
| 26 | [Helm từ chart đến rollback](labs/26-helm/README.md) | 7 · Vận hành cluster | kind hoặc kubeadm | 35′ |
| 27 | [Kustomize với base và overlay](labs/27-kustomize/README.md) | 7 · Vận hành cluster | kind hoặc kubeadm | 30′ |
| 28 | [CustomResourceDefinition và Operator](labs/28-crd-operator/README.md) | 7 · Vận hành cluster | kind hoặc kubeadm | 30′ |
| 29 | [Sao lưu và khôi phục etcd](labs/29-etcd-backup-restore/README.md) | 7 · Vận hành cluster | kind hoặc kubeadm (cần vào node) | 40′ |
| 30 | [Nâng cấp cluster kubeadm 1.36 → 1.37](labs/30-kubeadm-upgrade/README.md) | 7 · Vận hành cluster | kubeadm trên máy ảo | 60′ |
| 31 | [Chứng chỉ, cấu hình control plane và kubelet](labs/31-control-plane-config/README.md) | 7 · Vận hành cluster | kind hoặc kubeadm (cần vào node) | 35′ |
| 32 | [Thêm control plane cho cluster HA](labs/32-control-plane-ha/README.md) | 7 · Vận hành cluster | kubeadm trên máy ảo | 60′ |
| 39 | [Chuẩn bị node - container runtime, kernel và CRI](labs/39-node-runtime-prep/README.md) | 7 · Vận hành cluster | kind hoặc kubeadm (cần vào node) | 35′ |
| 40 | [Cài CNI Calico bằng Tigera Operator](labs/40-cni-tigera-operator/README.md) | 7 · Vận hành cluster | kind hoặc kubeadm | 40′ |
| 41 | [Helm với repo và OCI - Argo CD, sửa release lỗi](labs/41-helm-repo-oci/README.md) | 7 · Vận hành cluster | kind hoặc kubeadm | 35′ |
| 42 | [Cài và dùng một Operator thật - cert-manager](labs/42-operator-cert-manager/README.md) | 7 · Vận hành cluster | kind hoặc kubeadm | 30′ |
| 33 | [Troubleshooting ứng dụng: sáu Deployment hỏng](labs/33-troubleshoot-apps/README.md) | 8 · Troubleshooting | kind hoặc kubeadm | 40′ |
| 34 | [Troubleshooting mạng: Service, NetworkPolicy và DNS](labs/34-troubleshoot-network/README.md) | 8 · Troubleshooting | kind hoặc kubeadm | 40′ |
| 35 | [Troubleshooting control plane: scheduler và controller-manager](labs/35-troubleshoot-control-plane/README.md) | 8 · Troubleshooting | kind hoặc kubeadm (cần vào node) | 40′ |
| 36 | [Troubleshooting node: worker NotReady](labs/36-troubleshoot-node/README.md) | 8 · Troubleshooting | kind hoặc kubeadm (cần vào node) | 35′ |
| 37 | [Theo dõi tài nguyên, event và log](labs/37-monitoring-logs/README.md) | 8 · Troubleshooting | kind hoặc kubeadm | 30′ |
| 38 | [Đề thi thử CKA (2 giờ, 16 câu)](labs/38-mock-exam/README.md) | 9 · Thi thử | kind hoặc kubeadm (cần vào node) | 120′ |
| 45 | [Đề thi thử 2 - chế độ phòng thi (2 giờ, 16 câu)](labs/45-mock-exam-2/README.md) | 9 · Thi thử | kind hoặc kubeadm (cần vào node) | 120′ |
<!-- LABS:END -->

## Phủ năng lực của đề thi

Domain và năng lực theo curriculum CKA v1.37 (đề thi chạy Kubernetes v1.37).

<!-- COVERAGE:START -->
| Domain | Năng lực | Lab |
|---|---|---|
| Troubleshooting 30% | Troubleshoot cluster và node | 14, 39, 36, 38 |
| Troubleshooting 30% | Troubleshoot thành phần control plane | 31, 35 |
| Troubleshooting 30% | Theo dõi tài nguyên cluster và ứng dụng | 04, 10, 11, 33, 37, 45 |
| Troubleshooting 30% | Quản lý và đánh giá output, log của container | 03, 07, 08, 33, 37, 38, 45 |
| Troubleshooting 30% | Troubleshoot Service và networking | 15, 16, 34, 38, 45 |
| Cluster Architecture 25% | Quản lý RBAC | 23, 24, 25, 38, 45 |
| Cluster Architecture 25% | Chuẩn bị hạ tầng để cài cluster | 01, 39, 40 |
| Cluster Architecture 25% | Tạo và quản lý cluster bằng kubeadm | 01, 29, 30, 31, 32 |
| Cluster Architecture 25% | Quản lý vòng đời cluster (nâng cấp) | 29, 30 |
| Cluster Architecture 25% | Control plane high-availability | 32 |
| Cluster Architecture 25% | Cài thành phần bằng Helm và Kustomize | 26, 27, 41, 42, 45 |
| Cluster Architecture 25% | Interface mở rộng: CNI, CSI, CRI | 01, 28, 31, 39, 40, 45 |
| Cluster Architecture 25% | CRD, cài và cấu hình Operator | 43, 28, 41, 42, 45 |
| Services & Networking 20% | Kết nối giữa các Pod | 15, 17, 40 |
| Services & Networking 20% | NetworkPolicy | 17, 40, 34, 38, 45 |
| Services & Networking 20% | Service ClusterIP, NodePort, LoadBalancer và endpoints | 15, 43, 38, 45 |
| Services & Networking 20% | Gateway API | 19, 44, 45 |
| Services & Networking 20% | Ingress controller và Ingress | 18, 44, 38 |
| Services & Networking 20% | CoreDNS | 16, 34 |
| Workloads & Scheduling 15% | Deployment, rolling update, rollback | 05, 38, 45 |
| Workloads & Scheduling 15% | ConfigMap và Secret | 06, 38 |
| Workloads & Scheduling 15% | Autoscaling | 11, 38 |
| Workloads & Scheduling 15% | Primitive cho ứng dụng tự phục hồi | 07, 08, 09, 14, 33, 38, 45 |
| Workloads & Scheduling 15% | Admission và scheduling của Pod | 10, 12, 13, 14, 25, 38, 45 |
| Storage 10% | StorageClass và dynamic provisioning | 22, 38, 45 |
| Storage 10% | Volume type, access mode, reclaim policy | 20, 21, 45 |
| Storage 10% | PersistentVolume và PersistentVolumeClaim | 21, 22, 38, 45 |
<!-- COVERAGE:END -->

## Cấu trúc repo

```text
lab                     CLI
lib/common.sh           hàm dùng chung cho setup/verify/cleanup
env/kind/               cluster kind 3 node
env/kubeadm/            Vagrantfile + script chuẩn bị node cho kubeadm
src/labs/*.yaml         NGUỒN của mọi bài lab (sửa ở đây)
src/guides/NN.md        hướng dẫn từng bước / cách tiếp cận / quy trình tư duy
src/diagrams/NN.md      sơ đồ Mermaid: lab dựng gì và luồng hoạt động
labs/NN-tên/            sinh tự động: README.md, SOLUTION.md, setup.sh, verify.sh, cleanup.sh
tests/                  bộ kiểm thử chính các bài lab
docs/index.html         trang hướng dẫn, sinh tự động
tools/build.py          sinh labs/, README (bảng), docs/ từ src/
tools/check_diagrams.py render thử mọi sơ đồ Mermaid để bắt lỗi cú pháp
tools/learn.html        nguồn của phần Lý thuyết (docs/learn.html)
```

## Đóng góp

Mỗi bài là một mục trong `src/labs/*.yaml`. Sau khi sửa:

```bash
pip install pyyaml markdown
python3 tools/build.py
python3 tools/check_diagrams.py 07   # cần mermaid-cli: npm i -g @mermaid-js/mermaid-cli
tests/run.sh 07          # setup → verify phải FAIL → lời giải mẫu → verify phải PASS → cleanup
```

`tests/run.sh` không tham số chạy mọi bài có trong `tests/labs.txt` (những bài không cần VM hay quyền sửa control plane). Workflow `.github/workflows/test-labs.yml` chạy bộ này trên kind, kích hoạt thủ công trong tab Actions.

## Giấy phép

MIT. Tên CKA và Kubernetes thuộc về Linux Foundation và CNCF; repo này không liên kết với họ.
