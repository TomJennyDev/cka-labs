# Bộ file mẫu theo best practice

Một ứng dụng mẫu `web-api` (image [podinfo](https://github.com/stefanprodan/podinfo)), viết theo ba cách triển khai phổ biến. Mọi file đều có chú thích giải thích vì sao viết như vậy. Bộ file được kiểm tra bằng `python3 tools/check_examples.py`: render rồi `kubectl apply --dry-run=server` vào namespace bật Pod Security `restricted`.

```text
examples/web-api/
├── base/                     # YAML chuẩn production, đồng thời là Kustomize base
│   ├── kustomization.yaml
│   ├── namespace.yaml        # Namespace + Pod Security + ResourceQuota + LimitRange
│   ├── serviceaccount.yaml
│   ├── configmap.yaml
│   ├── deployment.yaml       # labels, probes, resources, securityContext, topology spread
│   ├── service.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   ├── networkpolicy.yaml    # default-deny + mở đúng cổng cần
│   └── httproute.yaml
├── overlays/
│   ├── dev/kustomization.yaml
│   └── prod/
│       ├── kustomization.yaml
│       └── deployment-resources.yaml
└── helm/web-api/             # cùng ứng dụng, đóng gói thành Helm chart
    ├── Chart.yaml
    ├── values.yaml
    ├── values-prod.yaml
    ├── values.schema.json
    ├── .helmignore
    └── templates/
        ├── _helpers.tpl
        ├── deployment.yaml  service.yaml  configmap.yaml  serviceaccount.yaml
        ├── hpa.yaml  pdb.yaml  networkpolicy.yaml  httproute.yaml  ingress.yaml
        ├── NOTES.txt
        └── tests/test-connection.yaml
```

## Dùng thử

```bash
# Kustomize
kubectl kustomize examples/web-api/overlays/prod      # xem YAML cuối cùng
kubectl apply -k examples/web-api/overlays/dev

# Helm
helm lint examples/web-api/helm/web-api
helm template web-api examples/web-api/helm/web-api -n web-api -f examples/web-api/helm/web-api/values-prod.yaml
helm upgrade --install web-api examples/web-api/helm/web-api -n web-api --create-namespace --wait
helm test web-api -n web-api
```

## Cách chia thư mục trong dự án thật

### 1. Repo của một ứng dụng

```text
web-api/
├── src/                      # mã nguồn
├── Dockerfile
├── deploy/
│   └── helm/web-api/         # chart đi cùng mã nguồn, phiên bản theo ứng dụng
└── .github/workflows/
    └── ci.yaml               # build image (tag = git SHA) → helm lint → render → kubeconform
```

Hợp khi một đội sở hữu cả mã nguồn và cách triển khai, và chỉ có vài môi trường.

### 2. Kustomize: base và overlays

```text
deploy/
├── base/                     # cấu hình chung, áp được ngay
├── components/               # khối tùy chọn bật theo môi trường (vd. debug sidecar)
└── overlays/
    ├── dev/                  # chỉ ghi phần KHÁC base
    ├── staging/
    └── prod/
```

### 3. Repo GitOps cho nhiều cluster (Argo CD hoặc Flux)

```text
platform-gitops/
├── clusters/
│   ├── prod-sg/              # mỗi cluster một thư mục, trỏ tới những gì cluster đó chạy
│   │   ├── infrastructure.yaml
│   │   └── apps.yaml
│   └── staging-sg/
├── infrastructure/
│   ├── controllers/          # cert-manager, Gateway controller, External Secrets, metrics-server
│   └── configs/              # ClusterIssuer, GatewayClass, StorageClass, PriorityClass
├── tenants/                  # mỗi đội: Namespace, ResourceQuota, LimitRange, RoleBinding
└── apps/
    ├── base/web-api/
    ├── staging/web-api/      # overlay hoặc values-staging.yaml
    └── production/web-api/
```

Nguyên tắc chung:

- Môi trường là **thư mục**, không phải nhánh Git. Đưa lên môi trường sau bằng một PR đổi tag image.
- Hạ tầng dùng chung (controller, CRD, StorageClass) tách khỏi ứng dụng và được cài trước.
- Không commit bí mật. Dùng External Secrets, Sealed Secrets hoặc SOPS; chart và base chỉ tham chiếu tên Secret.
- Mọi thứ trong Git đều phải render được và kiểm tra được trong CI: `helm lint`, `kubectl kustomize`, `kubeconform`, chính sách (Kyverno, Gatekeeper).
