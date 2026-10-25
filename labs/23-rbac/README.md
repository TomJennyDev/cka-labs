# Lab 23 · RBAC với Role, ClusterRole và ServiceAccount

**Cấp độ 6 · Bảo mật** · khoảng 35 phút · môi trường: kind hoặc kubeadm

Năng lực CKA: Cluster Architecture › Quản lý RBAC

## Mục tiêu

Cấp đúng và đủ quyền theo nguyên tắc tối thiểu cho ServiceAccount, user và group; kiểm tra bằng `kubectl auth can-i`; tìm và gỡ một quyền thừa.

## Kiến thức cần nắm

- **Role** (trong namespace) và **ClusterRole** (toàn cluster) chứa `rules`: `apiGroups`, `resources` (kể cả subresource như `pods/log`, `pods/exec`), `verbs`, tùy chọn `resourceNames`.
- **RoleBinding** gắn Role *hoặc ClusterRole* cho chủ thể **trong một namespace**. **ClusterRoleBinding** gắn ClusterRole cho toàn cluster.
- Chủ thể: `User`, `Group`, `ServiceAccount` (`system:serviceaccount:<ns>:<tên>`). RBAC chỉ **cho phép**, không có luật từ chối.
- ClusterRole có sẵn: `view`, `edit`, `admin`, `cluster-admin`.

## Chuẩn bị

```bash
./lab start 23
```

## Đề bài

1. Trong `lab23`, tạo ServiceAccount `deployer` và Role `deploy-manager` cho phép `get, list, watch, create, update, patch, delete` trên `deployments` và chỉ `get, list` trên `pods`. Gắn Role cho `deployer` bằng RoleBinding `deployer-binding`.

2. Tạo ClusterRole `node-reader` (`get, list, watch` trên `nodes`) và ClusterRoleBinding `ops-node-reader` gắn cho group `ops-team`.

3. User `jane` chỉ được đọc Pod và log của Pod trong `lab23`. Tạo Role `log-reader` và RoleBinding `jane-logs`.

4. ServiceAccount `auditor` (tạo mới trong `lab23`) được quyền của ClusterRole có sẵn `view`, nhưng **chỉ trong** namespace `lab23`.

5. ServiceAccount `legacy-bot` trong `lab23` đang xóa được Secret, việc này không được phép. Tìm binding cấp quyền đó, ghi tên binding vào `~/cka-answers/23-binding.txt`, rồi xóa binding.

## Gợi ý

<details><summary>Kiểm tra quyền</summary>

`kubectl auth can-i delete deployments -n lab23 --as=system:serviceaccount:lab23:deployer` hoặc `--as=jane`, `--as=x --as-group=ops-team`

</details>

<details><summary>Tìm binding của một ServiceAccount</summary>

`kubectl get rolebinding,clusterrolebinding -A -o wide | grep legacy-bot`

</details>

## Chấm bài

```bash
./lab check 23
```

Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).

## Dọn dẹp

```bash
./lab reset 23
```

## Tài liệu

- [Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Service accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)

---

← [Lab 22 · StorageClass, dynamic provisioning và StatefulSet](../22-storageclass-statefulset/README.md) · [Lab 24 · User mới bằng chứng chỉ, CSR và kubeconfig](../24-users-csr-kubeconfig/README.md) →
