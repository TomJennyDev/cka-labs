# CKA Labs

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
<!-- LABS:END -->

<!-- COVERAGE:START -->
| Domain | Năng lực | Lab |
|---|---|---|
| Troubleshooting 30% | Troubleshoot cluster và node | 14 |
| Troubleshooting 30% | Troubleshoot thành phần control plane | — |
| Troubleshooting 30% | Theo dõi tài nguyên cluster và ứng dụng | 04, 10, 11 |
| Troubleshooting 30% | Quản lý và đánh giá output, log của container | 03, 07, 08 |
| Troubleshooting 30% | Troubleshoot Service và networking | 15, 16 |
| Cluster Architecture 25% | Quản lý RBAC | — |
| Cluster Architecture 25% | Chuẩn bị hạ tầng để cài cluster | 01 |
| Cluster Architecture 25% | Tạo và quản lý cluster bằng kubeadm | 01 |
| Cluster Architecture 25% | Quản lý vòng đời cluster (nâng cấp) | — |
| Cluster Architecture 25% | Control plane high-availability | — |
| Cluster Architecture 25% | Cài thành phần bằng Helm và Kustomize | — |
| Cluster Architecture 25% | Interface mở rộng: CNI, CSI, CRI | 01 |
| Cluster Architecture 25% | CRD, cài và cấu hình Operator | — |
| Services & Networking 20% | Kết nối giữa các Pod | 15, 17 |
| Services & Networking 20% | NetworkPolicy | 17 |
| Services & Networking 20% | Service ClusterIP, NodePort, LoadBalancer và endpoints | 15 |
| Services & Networking 20% | Gateway API | 19 |
| Services & Networking 20% | Ingress controller và Ingress | 18 |
| Services & Networking 20% | CoreDNS | 16 |
| Workloads & Scheduling 15% | Deployment, rolling update, rollback | 05 |
| Workloads & Scheduling 15% | ConfigMap và Secret | 06 |
| Workloads & Scheduling 15% | Autoscaling | 11 |
| Workloads & Scheduling 15% | Primitive cho ứng dụng tự phục hồi | 07, 08, 09, 14 |
| Workloads & Scheduling 15% | Admission và scheduling của Pod | 10, 12, 13, 14 |
| Storage 10% | StorageClass và dynamic provisioning | — |
| Storage 10% | Volume type, access mode, reclaim policy | — |
| Storage 10% | PersistentVolume và PersistentVolumeClaim | — |
<!-- COVERAGE:END -->
