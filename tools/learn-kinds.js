/* ---------- Workload resources: one tab per kind ---------- */
/* Nguồn của mục "Workload resources" trong learn.html. build.py chèn file này vào trang. */
const KINDS = [
  {
    id: "pod", name: "Pod", api: "v1", short: "po",
    what: "Đơn vị nhỏ nhất Kubernetes chạy. Một Pod gồm một hoặc nhiều container dùng chung một địa chỉ IP (network namespace), chung volume, và luôn được đặt trên cùng một node.",
    when: "Hầu như không tạo Pod trực tiếp trong thực tế. Dùng Pod trần để thử nhanh, debug, hoặc static pod của control plane.",
    not: "Ứng dụng cần sống sót khi node chết hoặc khi Pod bị xóa: Pod trần không được ai tạo lại. Dùng Deployment, StatefulSet, DaemonSet hay Job.",
    diagram: `flowchart LR
  subgraph pod ["Pod web (một IP: 10.244.1.7)"]
    pause["pause: giữ network namespace"]
    init["initContainers: chạy lần lượt, phải thoát 0"]
    sc["sidecar: init + restartPolicy Always"]
    app["containers: app chính"]
    v[("volumes: emptyDir, configMap, PVC…")]
  end
  init --> app
  sc -.-> app
  v --- app
  v --- sc
  kl["kubelet trên node"] -->|"tạo, probe, restart"| pod`,
    seq: `stateDiagram-v2
  [*] --> Pending: được tạo, chờ scheduler và kéo image
  Pending --> Running: ít nhất một container đang chạy
  Running --> Succeeded: mọi container thoát 0 (restartPolicy Never/OnFailure)
  Running --> Failed: container thoát lỗi và không được restart
  Running --> Running: container chết, kubelet restart (restartPolicy Always)
  Pending --> Failed: không chạy được (vd. vượt activeDeadlineSeconds)
  Succeeded --> [*]
  Failed --> [*]`,
    fields: [
      ["spec.containers[]", "image, command/args, ports, env/envFrom, resources, probes, volumeMounts, securityContext"],
      ["spec.initContainers[]", "Chạy lần lượt trước app. Thêm restartPolicy: Always thì thành native sidecar (GA v1.33)"],
      ["spec.restartPolicy", "Always (mặc định), OnFailure, Never. Áp cho mọi container của Pod"],
      ["spec.nodeName / nodeSelector / affinity / tolerations", "Quyết định Pod chạy ở node nào"],
      ["spec.volumes[]", "Khai báo volume ở cấp Pod; container gắn bằng volumeMounts"],
      ["spec.serviceAccountName", "Danh tính của Pod khi gọi API (mặc định: default)"],
      ["spec.terminationGracePeriodSeconds", "Thời gian chờ sau SIGTERM trước SIGKILL (mặc định 30)"]
    ],
    yaml: `apiVersion: v1
kind: Pod
metadata:
  name: web
  labels: {app: web}
spec:
  containers:
  - name: nginx
    image: nginx:1.27
    ports: [{containerPort: 80}]
    resources:
      requests: {cpu: 100m, memory: 64Mi}`,
    cmds: [
      ["k run web --image=nginx:1.27 --port=80 $do > pod.yaml", "Sinh YAML Pod"],
      ["k get pod web -o wide", "Xem IP, node, trạng thái"],
      ["k describe pod web", "Events: lý do Pending, lỗi pull image, probe thất bại"],
      ["k logs web -c nginx --previous", "Log của lần chạy trước khi restart"],
      ["k exec -it web -- sh", "Vào shell trong container"],
      ["k replace --force -f pod.yaml", "Sửa trường không đổi được: xóa rồi tạo lại"]
    ],
    traps: [
      "Phần lớn spec của Pod đang chạy là bất biến. Đổi được tại chỗ: image, activeDeadlineSeconds, tolerations (chỉ thêm), label, annotation. Còn lại phải xóa và tạo lại.",
      "Pod trần mất luôn khi node chết hoặc khi bị drain với --force.",
      "STATUS trong kubectl get (CrashLoopBackOff, ImagePullBackOff…) là trạng thái container, không phải phase của Pod."
    ],
    labs: [3, 7, 8]
  },
  {
    id: "rs", name: "ReplicaSet", api: "apps/v1", short: "rs",
    what: "Controller giữ đúng N Pod khớp label selector. Thiếu thì tạo thêm từ template, thừa thì xóa bớt.",
    when: "Gần như không bao giờ tạo trực tiếp. Deployment tạo và quản lý ReplicaSet cho bạn, mỗi phiên bản Pod template một ReplicaSet.",
    not: "Cần cập nhật phiên bản ứng dụng: đổi template của ReplicaSet không thay các Pod đang chạy. Rolling update là việc của Deployment.",
    diagram: `flowchart LR
  d["Deployment web"] -->|"ownerReference"| rs["ReplicaSet web-5d4f8c<br/>replicas 3 · selector app=web,<br/>pod-template-hash=5d4f8c"]
  rs -->|"ownerReference"| p1["Pod web-5d4f8c-a"]
  rs --> p2["Pod web-5d4f8c-b"]
  rs --> p3["Pod web-5d4f8c-c"]
  orphan["Pod trần có label khớp selector"] -.->|"bị nhận nuôi"| rs`,
    seq: `sequenceDiagram
  participant RS as ReplicaSet controller
  participant A as kube-apiserver
  participant S as scheduler
  RS->>A: watch ReplicaSet và Pod
  RS->>RS: đếm Pod khớp selector, chưa bị xóa
  alt ít hơn replicas
    RS->>A: tạo Pod từ template (kèm ownerReference)
    S->>A: gán node cho Pod mới
  else nhiều hơn replicas
    RS->>A: xóa Pod thừa (ưu tiên Pod chưa Ready, mới tạo)
  end
  Note over RS: Pod bị xóa hay node chết<br/>→ vòng lặp tạo Pod mới`,
    fields: [
      ["spec.replicas", "Số Pod mong muốn (mặc định 1)"],
      ["spec.selector", "Chọn Pod để quản lý. Bất biến sau khi tạo; phải khớp template.metadata.labels"],
      ["spec.template", "Pod template dùng khi tạo Pod mới"],
      ["metadata.ownerReferences", "Trỏ về Deployment sở hữu (nếu có)"]
    ],
    yaml: `apiVersion: apps/v1
kind: ReplicaSet
metadata: {name: web}
spec:
  replicas: 3
  selector: {matchLabels: {app: web}}
  template:
    metadata: {labels: {app: web}}
    spec:
      containers: [{name: nginx, image: nginx:1.27}]`,
    cmds: [
      ["k get rs -l app=web", "ReplicaSet của một ứng dụng (cột DESIRED, CURRENT, READY)"],
      ["k describe rs <tên>", "Event FailedCreate: lỗi quota, PSA, admission"],
      ["k scale rs <tên> --replicas=0", "Scale trực tiếp (Deployment sẽ ghi đè nếu có chủ)"],
      ["k get pod <pod> -o jsonpath='{.metadata.ownerReferences[0].name}'", "Pod này thuộc ReplicaSet nào"]
    ],
    traps: [
      "Deployment thiếu Pod mà không thấy Pod lỗi: xem describe của ReplicaSet, không phải của Pod. Lỗi quota hay Pod Security nằm ở đó.",
      "Tạo Pod trần có label trùng selector: ReplicaSet coi nó là của mình và có thể xóa bớt cho đủ số lượng.",
      "Xóa ReplicaSet mặc định xóa luôn Pod (cascade). Thêm --cascade=orphan để giữ Pod."
    ],
    labs: [5, 10, 33]
  },
  {
    id: "deploy", name: "Deployment", api: "apps/v1", short: "deploy",
    what: "Quản lý ứng dụng không trạng thái: số bản sao, cập nhật dần (rolling update), quay lại phiên bản cũ. Deployment điều khiển các ReplicaSet, ReplicaSet điều khiển Pod.",
    when: "Mặc định cho web, API, worker không lưu dữ liệu cục bộ, mọi Pod như nhau và thay thế được cho nhau.",
    not: "Pod cần tên cố định, ổ đĩa riêng, khởi động theo thứ tự (database, Kafka, etcd): dùng StatefulSet.",
    diagram: `flowchart LR
  d["Deployment web<br/>replicas 3 · RollingUpdate<br/>maxSurge 25% · maxUnavailable 25%"]
  d --> r1["ReplicaSet rev 1 (nginx:1.27)<br/>0 Pod, giữ để rollback"]
  d --> r2["ReplicaSet rev 2 (nginx:1.28)<br/>3 Pod"]
  r2 --> p["Pod × 3"]
  h["revisionHistoryLimit 10"] -.-> r1`,
    seq: `sequenceDiagram
  participant U as kubectl set image
  participant D as Deployment controller
  participant N as ReplicaSet mới
  participant O as ReplicaSet cũ
  U->>D: template đổi (image mới)
  D->>N: tạo ReplicaSet với hash mới
  loop tới khi mới đủ, cũ về 0
    D->>N: scale lên (không vượt replicas + maxSurge)
    N-->>D: Pod mới Ready (sau minReadySeconds)
    D->>O: scale xuống (giữ ít nhất replicas − maxUnavailable)
  end
  Note over D: quá progressDeadlineSeconds<br/>→ Progressing=False
  U->>D: rollout undo → template quay về revision trước`,
    fields: [
      ["spec.replicas", "Số Pod mong muốn (mặc định 1)"],
      ["spec.strategy.type", "RollingUpdate (mặc định) hoặc Recreate (tắt hết rồi mới tạo)"],
      ["spec.strategy.rollingUpdate.maxSurge / maxUnavailable", "Mặc định 25% / 25%. 1 / 0 = không bao giờ thiếu Pod phục vụ"],
      ["spec.revisionHistoryLimit", "Số ReplicaSet cũ giữ lại để rollback (mặc định 10)"],
      ["spec.minReadySeconds", "Pod phải Ready bao lâu mới được tính là sẵn sàng (mặc định 0)"],
      ["spec.progressDeadlineSeconds", "Hạn để rollout tiến triển (mặc định 600)"],
      ["spec.paused", "Tạm dừng rollout để gom nhiều thay đổi"],
      ["metadata.annotations[kubernetes.io/change-cause]", "Hiện ở cột CHANGE-CAUSE của rollout history"]
    ],
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata: {name: web}
spec:
  replicas: 3
  selector: {matchLabels: {app: web}}
  strategy:
    type: RollingUpdate
    rollingUpdate: {maxSurge: 1, maxUnavailable: 0}
  template:
    metadata: {labels: {app: web}}
    spec:
      containers:
      - name: nginx
        image: nginx:1.27
        readinessProbe: {httpGet: {path: /, port: 80}}`,
    cmds: [
      ["k create deploy web --image=nginx:1.27 --replicas=3 $do > d.yaml", "Sinh YAML"],
      ["k set image deploy/web nginx=nginx:1.28", "Cập nhật image (tên container trước dấu =)"],
      ["k rollout status deploy/web", "Chờ rollout xong"],
      ["k rollout history deploy/web", "Các revision"],
      ["k rollout undo deploy/web --to-revision=2", "Quay lại revision cụ thể"],
      ["k rollout restart deploy/web", "Tạo lại mọi Pod (đổi annotation trong template)"],
      ["k scale deploy web --replicas=5", "Đổi số bản sao (không tạo revision mới)"]
    ],
    traps: [
      "Selector bất biến. Muốn đổi phải xóa và tạo lại Deployment.",
      "Chỉ thay đổi trong spec.template mới tạo revision mới. Scale không tạo revision.",
      "Đổi sang Recreate phải xóa luôn khối rollingUpdate, nếu không API từ chối.",
      "Rollout kẹt thường do Pod mới không Ready: image sai, probe sai, thiếu quota."
    ],
    labs: [5, 25, 33]
  },
  {
    id: "sts", name: "StatefulSet", api: "apps/v1", short: "sts",
    what: "Quản lý ứng dụng có trạng thái. Mỗi Pod có danh tính cố định: tên theo số thứ tự (db-0, db-1…), tên DNS riêng qua Service headless, và PVC riêng không đổi khi Pod được tạo lại.",
    when: "Database, hàng đợi, hệ thống bầu leader (PostgreSQL, MySQL, Kafka, Zookeeper, etcd): các bản sao không thay thế được cho nhau.",
    not: "Ứng dụng không trạng thái: StatefulSet chậm hơn khi scale và rollout vì đi theo thứ tự. Dùng Deployment.",
    diagram: `flowchart LR
  hs["Service db (clusterIP: None)"] --- sts["StatefulSet db<br/>serviceName db · replicas 3"]
  sts --> p0["db-0<br/>db-0.db.ns.svc.cluster.local"]
  sts --> p1["db-1"]
  sts --> p2["db-2"]
  p0 --- c0[("PVC data-db-0")]
  p1 --- c1[("PVC data-db-1")]
  p2 --- c2[("PVC data-db-2")]
  vct["volumeClaimTemplates: data"] -.-> c0 & c1 & c2`,
    seq: `sequenceDiagram
  participant C as StatefulSet controller
  participant A as kube-apiserver
  Note over C: podManagementPolicy OrderedReady (mặc định)
  C->>A: tạo PVC data-db-0 rồi Pod db-0
  A-->>C: db-0 Running và Ready
  C->>A: tạo PVC data-db-1 rồi Pod db-1
  A-->>C: db-1 Ready
  C->>A: tạo db-2
  Note over C,A: scale xuống: xóa db-2 trước,<br/>PVC data-db-2 vẫn giữ
  Note over C,A: rolling update: db-2 → db-1 → db-0,<br/>dừng ở partition nếu có`,
    fields: [
      ["spec.serviceName", "Tên Service headless tạo DNS cho từng Pod. Service phải tồn tại"],
      ["spec.volumeClaimTemplates[]", "Mỗi Pod một PVC tên <template>-<pod>"],
      ["spec.podManagementPolicy", "OrderedReady (mặc định, lần lượt) hoặc Parallel"],
      ["spec.updateStrategy", "RollingUpdate (mặc định, có partition) hoặc OnDelete"],
      ["spec.persistentVolumeClaimRetentionPolicy", "whenDeleted / whenScaled: Retain (mặc định) hoặc Delete"],
      ["spec.ordinals.start", "Số thứ tự bắt đầu (mặc định 0)"]
    ],
    yaml: `apiVersion: v1
kind: Service
metadata: {name: db}
spec:
  clusterIP: None
  selector: {app: db}
  ports: [{port: 5432}]
---
apiVersion: apps/v1
kind: StatefulSet
metadata: {name: db}
spec:
  serviceName: db
  replicas: 3
  selector: {matchLabels: {app: db}}
  template:
    metadata: {labels: {app: db}}
    spec:
      containers:
      - name: db
        image: postgres:17
        volumeMounts: [{name: data, mountPath: /var/lib/postgresql/data}]
  volumeClaimTemplates:
  - metadata: {name: data}
    spec:
      accessModes: [ReadWriteOnce]
      resources: {requests: {storage: 1Gi}}`,
    cmds: [
      ["k create deploy db --image=postgres:17 $do > sts.yaml", "Không có lệnh create sts: sinh YAML Deployment, đổi kind, thêm serviceName, bỏ strategy"],
      ["k get sts,pod,pvc -l app=db", "Xem Pod và PVC theo cặp"],
      ["k rollout status sts/db", "Chờ rollout xong"],
      ["k scale sts db --replicas=1", "Xóa db-2 rồi db-1; PVC vẫn còn"],
      ["k run t --rm -it --image=busybox:1.36 --restart=Never -- nslookup db-0.db", "Kiểm tra DNS riêng của Pod"]
    ],
    traps: [
      "Xóa StatefulSet không xóa PVC (mặc định Retain). Tạo lại cùng tên thì Pod gắn lại đúng PVC cũ.",
      "Pod kẹt ở một số thứ tự (ví dụ db-1 không Ready) chặn mọi Pod sau nó với OrderedReady.",
      "Node chết: Pod của StatefulSet không tự chuyển node để tránh hai bản cùng tên. Chỉ xóa --force khi chắc node đã tắt hẳn.",
      "volumeClaimTemplates không sửa được sau khi tạo (trừ dung lượng khi StorageClass cho phép mở rộng)."
    ],
    labs: [22, 15]
  },
  {
    id: "ds", name: "DaemonSet", api: "apps/v1", short: "ds",
    what: "Chạy đúng một Pod trên mỗi node phù hợp. Node mới vào cluster tự nhận Pod; node bị gỡ thì Pod bị dọn.",
    when: "Agent cấp node: thu log (Fluent Bit), giám sát (node-exporter), CNI (calico-node, cilium), kube-proxy, CSI node plugin.",
    not: "Ứng dụng cần số bản sao theo tải chứ không theo số node: dùng Deployment (có thể kèm anti-affinity).",
    diagram: `flowchart TB
  ds["DaemonSet node-agent<br/>tolerations · nodeSelector (tuỳ chọn)"]
  ds --> a["Pod trên control plane<br/>(cần tolerate taint control-plane)"]
  ds --> b["Pod trên worker 1"]
  ds --> c["Pod trên worker 2"]
  new["Node mới join"] -.->|"tự nhận Pod"| ds
  x["Node có taint không tolerate<br/>hoặc không khớp nodeSelector"] -.-x ds`,
    seq: `sequenceDiagram
  participant DC as DaemonSet controller
  participant A as kube-apiserver
  participant S as scheduler
  DC->>A: watch Node và DaemonSet
  DC->>DC: với mỗi node: khớp nodeSelector/affinity, tolerate taint?
  DC->>A: tạo Pod kèm nodeAffinity trỏ đúng tên node
  S->>A: bind Pod vào đúng node đó
  Note over DC: tự thêm toleration not-ready,<br/>unreachable, disk-pressure…
  Note over DC,A: RollingUpdate: maxUnavailable 1,<br/>từng node một`,
    fields: [
      ["spec.template.spec.tolerations", "Cần thêm để chạy trên control plane (node-role.kubernetes.io/control-plane:NoSchedule)"],
      ["spec.template.spec.nodeSelector / affinity", "Giới hạn tập node"],
      ["spec.updateStrategy", "RollingUpdate (maxUnavailable 1, maxSurge 0 mặc định) hoặc OnDelete"],
      ["status.desiredNumberScheduled / numberReady", "Bao nhiêu node cần Pod, bao nhiêu đã Ready"]
    ],
    yaml: `apiVersion: apps/v1
kind: DaemonSet
metadata: {name: node-agent}
spec:
  selector: {matchLabels: {app: node-agent}}
  template:
    metadata: {labels: {app: node-agent}}
    spec:
      tolerations:
      - {key: node-role.kubernetes.io/control-plane, operator: Exists, effect: NoSchedule}
      containers:
      - name: agent
        image: busybox:1.36
        command: ["sleep", "infinity"]`,
    cmds: [
      ["k create deploy node-agent --image=busybox:1.36 $do -- sleep infinity > ds.yaml", "Không có create ds: sinh Deployment, đổi kind, xóa replicas và strategy"],
      ["k get ds -A", "DESIRED = số node phù hợp"],
      ["k get pod -l app=node-agent -o wide", "Mỗi node một Pod"],
      ["k rollout status ds/node-agent", "Chờ cập nhật xong"],
      ["k drain <node> --ignore-daemonsets", "drain bỏ qua Pod DaemonSet (chúng sẽ quay lại)"]
    ],
    traps: [
      "DESIRED nhỏ hơn số node: kiểm tra taint của node thiếu Pod (thường là control plane).",
      "DaemonSet không có replicas. Số Pod do số node quyết định.",
      "Pod DaemonSet được tạo kèm nodeAffinity tới đúng node; đừng thêm nodeName thủ công."
    ],
    labs: [9, 45]
  },
  {
    id: "job", name: "Job", api: "batch/v1", short: "job",
    what: "Chạy Pod tới khi hoàn thành: đủ số lần thành công thì Job kết thúc. Pod lỗi thì thử lại tới backoffLimit.",
    when: "Tác vụ chạy một lần: migrate database, xử lý lô dữ liệu, sao lưu, tính toán song song có số phần cố định.",
    not: "Dịch vụ chạy mãi: Pod của Job không được có restartPolicy Always. Tác vụ định kỳ: dùng CronJob.",
    diagram: `flowchart LR
  j["Job batch<br/>completions 4 · parallelism 2<br/>backoffLimit 2"] --> p1["Pod 1 ✔"] & p2["Pod 2 ✔"]
  j -.->|"sau khi 2 Pod đầu xong"| p3["Pod 3 ✔"] & p4["Pod 4 ✘ → thử lại"]
  j --> done["Complete khi đủ 4 lần thành công"]
  ttl["ttlSecondsAfterFinished"] -.->|"tự xóa Job và Pod"| done`,
    seq: `sequenceDiagram
  participant J as Job controller
  participant A as kube-apiserver
  J->>A: tạo tối đa parallelism Pod
  A-->>J: Pod thoát 0 → succeeded += 1
  J->>A: tạo Pod tiếp cho tới khi đủ completions
  A-->>J: Pod thoát khác 0 → failed += 1
  alt failed > backoffLimit hoặc quá activeDeadlineSeconds
    J->>A: Job Failed, dừng mọi Pod
  else
    J->>A: tạo lại Pod sau thời gian chờ tăng dần (10s, 20s, 40s…)
  end
  J->>A: đủ completions → điều kiện Complete=True`,
    fields: [
      ["spec.completions", "Số lần thành công cần có (mặc định 1)"],
      ["spec.parallelism", "Số Pod chạy cùng lúc (mặc định 1)"],
      ["spec.backoffLimit", "Số lần thử lại trước khi Job Failed (mặc định 6)"],
      ["spec.activeDeadlineSeconds", "Giới hạn thời gian của cả Job"],
      ["spec.ttlSecondsAfterFinished", "Tự xóa Job sau khi xong"],
      ["spec.completionMode", "NonIndexed (mặc định) hoặc Indexed (mỗi Pod một chỉ số)"],
      ["spec.template.spec.restartPolicy", "Bắt buộc Never hoặc OnFailure"]
    ],
    yaml: `apiVersion: batch/v1
kind: Job
metadata: {name: batch}
spec:
  completions: 4
  parallelism: 2
  backoffLimit: 2
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - {name: sum, image: busybox:1.36, command: ["sh", "-c", "echo done"]}`,
    cmds: [
      ["k create job batch --image=busybox:1.36 $do -- sh -c 'echo done' > job.yaml", "Sinh YAML"],
      ["k get job batch -w", "Cột COMPLETIONS, ví dụ 4/4"],
      ["k get pod -l job-name=batch", "Pod của Job"],
      ["k logs job/batch", "Log của một Pod trong Job"],
      ["k wait --for=condition=complete job/batch --timeout=120s", "Chờ Job xong (dùng trong script)"]
    ],
    traps: [
      "restartPolicy: OnFailure thì container được restart tại chỗ (tính vào backoffLimit); Never thì tạo Pod mới.",
      "Pod của Job đã xong vẫn còn để đọc log, tới khi Job bị xóa hoặc hết TTL.",
      "spec.template của Job là bất biến. Muốn chạy lại phải xóa Job và tạo lại."
    ],
    labs: [9]
  },
  {
    id: "cj", name: "CronJob", api: "batch/v1", short: "cj",
    what: "Tạo Job theo lịch cron. Mỗi lần tới giờ, CronJob controller tạo một Job từ jobTemplate.",
    when: "Tác vụ định kỳ: sao lưu hằng đêm, dọn dữ liệu cũ, gửi báo cáo, xoay vòng chứng chỉ.",
    not: "Tác vụ cần chạy đúng một lần: tạo Job. Tác vụ cần chính xác tới giây hoặc lịch phức tạp: dùng hệ thống lập lịch ngoài.",
    diagram: `flowchart LR
  cj["CronJob report<br/>schedule '*/15 * * * *'<br/>concurrencyPolicy Forbid"] -->|"tới giờ"| j1["Job report-29012340"]
  cj -->|"tới giờ"| j2["Job report-29012355"]
  j1 --> p1["Pod"]
  j2 --> p2["Pod"]
  hist["successfulJobsHistoryLimit 3<br/>failedJobsHistoryLimit 1"] -.-> cj
  man["k create job report-now --from=cronjob/report"] -.->|"chạy ngay, ngoài lịch"| j3["Job report-now"]`,
    seq: `sequenceDiagram
  participant CC as CronJob controller
  participant A as kube-apiserver
  loop mỗi 10 giây
    CC->>CC: đã tới giờ theo schedule (và timeZone)?
  end
  alt Job lần trước còn chạy
    CC->>CC: Allow: vẫn tạo<br/>Forbid: bỏ qua · Replace: xóa Job cũ
  end
  CC->>A: tạo Job từ jobTemplate (tên kèm thời điểm)
  Note over CC: lỡ giờ quá startingDeadlineSeconds<br/>→ bỏ qua lần đó
  CC->>A: xóa Job cũ vượt history limit`,
    fields: [
      ["spec.schedule", "Cú pháp cron: phút giờ ngày tháng thứ. '*/15 * * * *' = mỗi 15 phút"],
      ["spec.timeZone", "Múi giờ IANA, ví dụ Asia/Ho_Chi_Minh (không đặt thì theo giờ của kube-controller-manager)"],
      ["spec.concurrencyPolicy", "Allow (mặc định), Forbid, Replace"],
      ["spec.startingDeadlineSeconds", "Lỡ giờ quá số giây này thì bỏ qua lần đó"],
      ["spec.successfulJobsHistoryLimit / failedJobsHistoryLimit", "Mặc định 3 / 1"],
      ["spec.suspend", "true = tạm dừng tạo Job mới"],
      ["spec.jobTemplate", "Toàn bộ spec của Job sẽ được tạo"]
    ],
    yaml: `apiVersion: batch/v1
kind: CronJob
metadata: {name: report}
spec:
  schedule: "*/15 * * * *"
  timeZone: Asia/Ho_Chi_Minh
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 2
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - {name: report, image: busybox:1.36, command: ["date"]}`,
    cmds: [
      ["k create cronjob report --image=busybox:1.36 --schedule='*/15 * * * *' $do -- date > cj.yaml", "Sinh YAML (nhớ đặt schedule trong nháy đơn)"],
      ["k create job report-now --from=cronjob/report", "Chạy ngay một lần để kiểm tra"],
      ["k get cj,job", "Lịch, lần chạy cuối, các Job đã tạo"],
      ["k patch cj report -p '{\"spec\":{\"suspend\":true}}'", "Tạm dừng"]
    ],
    traps: [
      "Không có cờ cho concurrencyPolicy hay history limit: sinh YAML rồi sửa.",
      "Lịch tính theo giờ của controller-manager (thường là UTC) nếu không đặt timeZone.",
      "CronJob đếm thời gian từ lúc controller thấy nó; tạo xong không chạy ngay. Dùng create job --from để thử."
    ],
    labs: [9]
  }
];

const KIND_ROWS = [
  ["Loại", "Pod", "ReplicaSet", "Deployment", "StatefulSet", "DaemonSet", "Job", "CronJob"],
  ["Quản lý", "Container", "N Pod giống nhau", "ReplicaSet theo phiên bản", "N Pod có danh tính", "Một Pod mỗi node", "Pod chạy tới khi xong", "Job theo lịch"],
  ["Tên Pod", "Tự đặt", "ngẫu nhiên", "ngẫu nhiên", "db-0, db-1… cố định", "ngẫu nhiên", "ngẫu nhiên", "theo Job"],
  ["Số bản sao do", "1", "replicas", "replicas (HPA được)", "replicas", "số node phù hợp", "completions / parallelism", "mỗi lần một Job"],
  ["Ổ đĩa riêng mỗi Pod", "–", "Không", "Không", "Có (volumeClaimTemplates)", "Thường hostPath", "Không", "Không"],
  ["Cập nhật", "Xóa, tạo lại", "Không tự cập nhật", "RollingUpdate, Recreate", "RollingUpdate theo thứ tự, OnDelete", "RollingUpdate, OnDelete", "Bất biến", "Áp dụng cho Job sau"],
  ["restartPolicy của Pod", "Tùy chọn", "Always", "Always", "Always", "Always", "Never / OnFailure", "Never / OnFailure"],
  ["Lệnh tạo nhanh", "k run", "(qua Deployment)", "k create deploy", "(sửa YAML Deployment)", "(sửa YAML Deployment)", "k create job", "k create cronjob"]
];

const KIND_PICK = `flowchart TD
  q1{"Chạy mãi hay chạy xong rồi dừng?"}
  q1 -->|"chạy xong"| q2{"Theo lịch?"}
  q2 -->|"có"| cj["CronJob"]
  q2 -->|"không"| job["Job"]
  q1 -->|"chạy mãi"| q3{"Mỗi node đúng một bản?"}
  q3 -->|"có"| ds["DaemonSet"]
  q3 -->|"không"| q4{"Cần tên cố định, ổ riêng,<br/>thứ tự khởi động?"}
  q4 -->|"có"| sts["StatefulSet"]
  q4 -->|"không"| dep["Deployment<br/>(tự tạo ReplicaSet và Pod)"]`;

let kindCur = "deploy";
let mmdLoad = null;
const mmdDark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
function mmdRender(root) {
  const nodes = $$("pre.mermaid:not([data-done])", root);
  if (!nodes.length) return;
  nodes.forEach(n => n.dataset.done = "1");
  mmdLoad = mmdLoad || new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
  mmdLoad.then(() => {
    window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: mmdDark() ? "dark" : "neutral", fontFamily: "Be Vietnam Pro, system-ui, sans-serif", sequence: { mirrorActors: false } });
    return window.mermaid.run({ nodes: nodes.filter(n => n.isConnected) });
  }).catch(() => { mmdLoad = null; nodes.forEach(n => delete n.dataset.done); });
}
const kEsc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mmd = src => '<div class="mmd"><pre class="mermaid">' + kEsc(src) + "</pre></div>";

function kindsInit() {
  const box = $("#kindsTop");
  if (!box.dataset.ready) {
    box.dataset.ready = "1";
    $("#kindsPick").innerHTML = mmd(KIND_PICK);
    $("#kindsCmp").innerHTML = "<thead><tr>" + KIND_ROWS[0].map(h => "<th>" + kEsc(h) + "</th>").join("") + "</tr></thead><tbody>" +
      KIND_ROWS.slice(1).map(r => "<tr><th>" + kEsc(r[0]) + "</th>" + r.slice(1).map(c => "<td>" + kEsc(c) + "</td>").join("") + "</tr>").join("") + "</tbody>";
    $("#kindsTabs").innerHTML = KINDS.map(k => '<button type="button" data-k="' + k.id + '" aria-pressed="false">' + kEsc(k.name) + "</button>").join("");
    $("#kindsTabs").addEventListener("click", e => { const b = e.target.closest("button[data-k]"); if (b) { kindCur = b.dataset.k; store.set("kind", kindCur); kindShow(); } });
    kindCur = store.get("kind", "deploy");
  }
  kindShow();
  mmdRender($("#kindsTop"));
}
function kindShow() {
  const k = KINDS.find(x => x.id === kindCur) || KINDS[2];
  $$("#kindsTabs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === k.id ? "true" : "false"));
  const labs = k.labs.map(n => '<a class="pill cp" style="text-decoration:none" href="index.html#lab-' + String(n).padStart(2, "0") + '">Lab ' + String(n).padStart(2, "0") + "</a>").join(" ");
  $("#kindBody").innerHTML =
    '<div class="vh" style="gap:4px"><p class="eyebrow">' + kEsc(k.api) + " · tên tắt <code>" + kEsc(k.short) + "</code></p><h3 style=\"margin:0\">" + kEsc(k.name) + '</h3></div>' +
    '<p class="lead" style="color:var(--ink)">' + kEsc(k.what) + "</p>" +
    '<div class="split even"><div class="panel"><h4>Nên dùng khi</h4><p class="small">' + kEsc(k.when) + '</p></div><div class="panel"><h4>Không nên dùng khi</h4><p class="small">' + kEsc(k.not) + "</p></div></div>" +
    '<div class="panel col"><h4>Cấu trúc</h4>' + mmd(k.diagram) + '</div><div class="panel col"><h4>Controller làm việc thế nào</h4>' + mmd(k.seq) + "</div>" +
    '<div class="panel"><h4>Trường quan trọng</h4><div class="tbl"><table><tbody>' + k.fields.map(f => "<tr><td><code>" + kEsc(f[0]) + "</code></td><td>" + kEsc(f[1]) + "</td></tr>").join("") + "</tbody></table></div></div>" +
    '<div class="split even"><div class="panel col"><h4>YAML tối thiểu</h4><div class="codewrap"><pre class="code">' + kEsc(k.yaml) + '</pre></div></div><div class="panel col"><h4>Lệnh hay dùng</h4>' +
      k.cmds.map(c => '<div class="cmdrow"><code>' + kEsc(c[0]) + "</code><span>" + kEsc(c[1]) + "</span></div>").join("") + "</div></div>" +
    '<div class="panel"><h4>Bẫy hay gặp</h4><ul class="tight">' + k.traps.map(t => "<li>" + kEsc(t) + "</li>").join("") + '</ul><p class="small" style="margin-top:12px">Luyện trên cluster: ' + labs + "</p></div>";
  $$("#kindBody pre.code").forEach(pre => { if (pre.parentElement.querySelector(".copy")) return; const b = document.createElement("button"); b.className = "copy"; b.type = "button"; b.textContent = "Chép"; b.onclick = () => { try { navigator.clipboard.writeText(pre.textContent); b.textContent = "Đã chép"; } catch (e) {} setTimeout(() => b.textContent = "Chép", 1200); }; pre.parentElement.appendChild(b); });
  mmdRender($("#kindBody"));
}
onShow.kinds = kindsInit;
if (current === "kinds" || (location.hash || "").slice(1) === "kinds") kindsInit();
