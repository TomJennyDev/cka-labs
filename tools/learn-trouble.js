/* ---------- Troubleshooting: mô phỏng lỗi Pod có animation ---------- */
/* Chọn một lỗi: Pod chạy qua từng chặng và dừng ở chặng hỏng; kubectl get pod -w và Events hiện dần;
   sau đó là nguyên nhân, lệnh kiểm tra, cách sửa và nút chạy lại sau khi sửa. build.py chèn vào learn.html. */

const TB_STAGES = [["kubectl", "apply"], ["apiserver", "admission, quota"], ["controller", "tạo Pod"], ["scheduler", "chọn node"], ["kubelet", "mount volume"], ["CNI", "cấp IP"], ["registry", "kéo image"], ["runtime", "tạo container"], ["tiến trình", "chạy lệnh"], ["probe", "liveness"], ["Service", "readiness"]];
const TB_GROUPS = [["img", "Image"], ["cfg", "Cấu hình"], ["crash", "Crash & probe"], ["sched", "Lập lịch"], ["adm", "Bị chặn khi tạo"], ["node", "Node & runtime"]];
const tbS = (st, rd, rs) => [st, rd || "0/1", rs || 0];
const tbW = (r, f, m) => ["Warning", r, f, m], tbN = (r, f, m) => ["Normal", r, f, m];
const TB_SCHED = tbN("Scheduled", "default-scheduler", "Successfully assigned default/web-7c9d-x2 to node01");
const TB_PULLING = img => tbN("Pulling", "kubelet", 'Pulling image "' + img + '"');
const TB_PULLED = img => tbN("Pulled", "kubelet", 'Successfully pulled image "' + img + '" in 1.2s');
const TB_CREATED = c => tbN("Created", "kubelet", "Created container " + (c || "web"));
const TB_STARTED = c => tbN("Started", "kubelet", "Started container " + (c || "web"));

const TB_ERRS = [
  { id: "tag", g: "img", st: "ImagePullBackOff", t: "Sai tag image", at: 6, loop: 1,
    seq: [tbS("ContainerCreating"), tbS("ErrImagePull"), tbS("ImagePullBackOff"), tbS("ErrImagePull"), tbS("ImagePullBackOff")],
    ev: [TB_SCHED, TB_PULLING("nginx:1.277"), tbW("Failed", "kubelet", 'Failed to pull image "nginx:1.277": rpc error: code = NotFound desc = failed to pull and unpack image "docker.io/library/nginx:1.277": failed to resolve reference "docker.io/library/nginx:1.277": docker.io/library/nginx:1.277: not found'), tbW("Failed", "kubelet", "Error: ErrImagePull"), tbN("BackOff", "kubelet", 'Back-off pulling image "nginx:1.277"'), tbW("Failed", "kubelet", "Error: ImagePullBackOff")],
    why: "Tag nginx:1.277 không tồn tại trên registry. ErrImagePull là lần kéo hỏng; ImagePullBackOff là kubelet đang chờ (10s, 20s, 40s… tối đa 5 phút) trước khi thử lại.",
    chk: "k describe pod web-7c9d-x2 | grep -A2 Failed\nsudo crictl pull nginx:1.277        # trên node: tách lỗi khỏi Kubernetes", fix: "k set image deploy/web web=nginx:1.27\nk rollout status deploy/web" },
  { id: "auth", g: "img", st: "ImagePullBackOff", t: "Registry private, thiếu imagePullSecret", at: 6, loop: 1,
    seq: [tbS("ContainerCreating"), tbS("ErrImagePull"), tbS("ImagePullBackOff")],
    ev: [TB_SCHED, TB_PULLING("ghcr.io/acme/api:1.4"), tbW("Failed", "kubelet", 'Failed to pull image "ghcr.io/acme/api:1.4": failed to pull and unpack image "ghcr.io/acme/api:1.4": failed to resolve reference "ghcr.io/acme/api:1.4": failed to authorize: failed to fetch anonymous token: unexpected status from GET request to https://ghcr.io/token?scope=repository%3Aacme%2Fapi%3Apull&service=ghcr.io: 401 Unauthorized'), tbW("Failed", "kubelet", "Error: ErrImagePull"), tbW("Failed", "kubelet", "Error: ImagePullBackOff")],
    why: "Registry đòi đăng nhập, Pod không có imagePullSecrets (hoặc Secret nằm ở namespace khác).",
    chk: "k get pod web-7c9d-x2 -o jsonpath='{.spec.imagePullSecrets}'\nk get secret -n default | grep docker", fix: "k create secret docker-registry regcred --docker-server=ghcr.io \\\n  --docker-username=<user> --docker-password=<token> -n default\nk patch sa default -p '{\"imagePullSecrets\":[{\"name\":\"regcred\"}]}'\nk rollout restart deploy/web" },
  { id: "invalid", g: "img", st: "InvalidImageName", t: "Tên image sai cú pháp", at: 6,
    seq: [tbS("ContainerCreating"), tbS("InvalidImageName")],
    ev: [TB_SCHED, tbW("InspectFailed", "kubelet", 'Failed to apply default image tag "nginx:1.27:alpine": couldn\'t parse image name "nginx:1.27:alpine": invalid reference format'), tbW("Failed", "kubelet", "Error: InvalidImageName")],
    why: "Image có hai dấu hai chấm, chữ hoa hoặc ký tự lạ. kubelet không thử kéo nên không có back-off.",
    chk: "k get pod web-7c9d-x2 -o jsonpath='{.spec.containers[*].image}'", fix: "k set image deploy/web web=nginx:1.27-alpine" },
  { id: "never", g: "img", st: "ErrImageNeverPull", t: "imagePullPolicy: Never, image chưa có trên node", at: 6,
    seq: [tbS("ContainerCreating"), tbS("ErrImageNeverPull")],
    ev: [TB_SCHED, tbW("ErrImageNeverPull", "kubelet", 'Container image "myapp:dev" is not present with pull policy of Never'), tbW("Failed", "kubelet", "Error: ErrImageNeverPull")],
    why: "Policy Never chỉ dùng image có sẵn trên node. Image build ở máy khác hoặc node khác thì không có.",
    chk: "sudo crictl images | grep myapp       # trên node01", fix: "Đặt imagePullPolicy: IfNotPresent và đẩy image lên registry,\nhoặc nạp image vào đúng node: sudo ctr -n k8s.io images import myapp.tar" },
  { id: "dnsreg", g: "img", st: "ImagePullBackOff", t: "Node không tới được registry", at: 6, loop: 1,
    seq: [tbS("ContainerCreating"), tbS("ErrImagePull"), tbS("ImagePullBackOff")],
    ev: [TB_SCHED, TB_PULLING("registry.local:5000/api:1.0"), tbW("Failed", "kubelet", 'Failed to pull image "registry.local:5000/api:1.0": failed to do request: Head "https://registry.local:5000/v2/api/manifests/1.0": dial tcp: lookup registry.local on 10.0.0.2:53: no such host'), tbW("Failed", "kubelet", "Error: ErrImagePull")],
    why: "Node (không phải Pod) phân giải tên và gọi registry. DNS của node, proxy hoặc firewall chặn.",
    chk: "ssh node01\ncat /etc/resolv.conf\nsudo crictl pull registry.local:5000/api:1.0\ncurl -v https://registry.local:5000/v2/", fix: "Sửa DNS/hosts của node, cấu hình proxy cho containerd (/etc/systemd/system/containerd.service.d/http-proxy.conf),\nhoặc mở firewall tới registry." },
  { id: "ratelimit", g: "img", st: "ImagePullBackOff", t: "Docker Hub giới hạn lượt kéo", at: 6, loop: 1,
    seq: [tbS("ContainerCreating"), tbS("ErrImagePull"), tbS("ImagePullBackOff")],
    ev: [TB_SCHED, TB_PULLING("redis:7.4"), tbW("Failed", "kubelet", 'Failed to pull image "redis:7.4": … 429 Too Many Requests - Server message: toomanyrequests: You have reached your pull rate limit.'), tbW("Failed", "kubelet", "Error: ErrImagePull")],
    why: "Docker Hub giới hạn lượt kéo ẩn danh theo IP; cả cluster đi ra một IP NAT nên hết nhanh.",
    chk: "k get events -A | grep -i toomanyrequests", fix: "Dùng registry mirror/cache nội bộ, đăng nhập Docker Hub qua imagePullSecrets,\nhoặc dùng image từ registry khác (mirror.gcr.io, public.ecr.aws)." },
  { id: "arch", g: "img", st: "CrashLoopBackOff", t: "Image sai kiến trúc CPU", at: 8, loop: 1,
    seq: [tbS("ContainerCreating"), tbS("Error", "0/1", 0), tbS("CrashLoopBackOff", "0/1", 1), tbS("Error", "0/1", 2), tbS("CrashLoopBackOff", "0/1", 2)],
    ev: [TB_SCHED, TB_PULLED("acme/api:1.4"), TB_CREATED(), TB_STARTED(), tbW("BackOff", "kubelet", "Back-off restarting failed container web in pod web-7c9d-x2_default")],
    logs: "exec /usr/local/bin/api: exec format error",
    why: "Image chỉ build cho amd64 mà node là arm64 (hoặc ngược lại). Kéo được nhưng không chạy được.",
    chk: "k logs web-7c9d-x2 --previous\nk get node node01 -L kubernetes.io/arch\nsudo crictl inspecti acme/api:1.4 | grep -i arch", fix: "Build image đa kiến trúc (docker buildx --platform linux/amd64,linux/arm64)\nhoặc ghim Pod vào node đúng kiến trúc bằng nodeSelector kubernetes.io/arch." },

  { id: "cfgmap", g: "cfg", st: "CreateContainerConfigError", t: "ConfigMap trong env không tồn tại", at: 7,
    seq: [tbS("ContainerCreating"), tbS("CreateContainerConfigError")],
    ev: [TB_SCHED, TB_PULLED("nginx:1.27"), tbW("Failed", "kubelet", 'Error: configmap "app-cfg" not found')],
    why: "env/envFrom tham chiếu ConfigMap chưa tạo hoặc khác namespace. Image đã kéo xong, container chưa được tạo.",
    chk: "k get cm -n default\nk get pod web-7c9d-x2 -o yaml | grep -B2 -A3 configMap", fix: "k create configmap app-cfg --from-literal=LOG_LEVEL=info -n default\n# kubelet tự thử lại, không cần xóa Pod" },
  { id: "seckey", g: "cfg", st: "CreateContainerConfigError", t: "Secret thiếu key", at: 7,
    seq: [tbS("ContainerCreating"), tbS("CreateContainerConfigError")],
    ev: [TB_SCHED, TB_PULLED("api:1.4"), tbW("Failed", "kubelet", "Error: couldn't find key DB_PASS in Secret default/db")],
    why: "secretKeyRef trỏ tới key không có trong Secret (gõ sai, hoặc Secret tạo bằng tên key khác).",
    chk: "k get secret db -o jsonpath='{.data}' | tr ',' '\\n'", fix: "k patch secret db -p '{\"stringData\":{\"DB_PASS\":\"…\"}}'\n# hoặc sửa key trong secretKeyRef của Deployment" },
  { id: "mount", g: "cfg", st: "ContainerCreating", t: "Volume tham chiếu ConfigMap không có", at: 4,
    seq: [tbS("ContainerCreating"), tbS("ContainerCreating"), tbS("ContainerCreating")],
    ev: [TB_SCHED, tbW("FailedMount", "kubelet", 'MountVolume.SetUp failed for volume "cfg" : configmap "app-cfg" not found')],
    why: "Volume configMap/secret chưa có nên kubelet không mount được; Pod đứng ContainerCreating (không phải lỗi image).",
    chk: "k describe pod web-7c9d-x2 | grep -A3 FailedMount", fix: "Tạo ConfigMap app-cfg, hoặc đặt optional: true cho volume nếu nó thật sự không bắt buộc." },
  { id: "cmd", g: "cfg", st: "RunContainerError", t: "Sai command (không có file thực thi)", at: 8, loop: 1,
    seq: [tbS("ContainerCreating"), tbS("RunContainerError", "0/1", 0), tbS("CrashLoopBackOff", "0/1", 1)],
    ev: [TB_SCHED, TB_PULLED("python:3.13-slim"), TB_CREATED(), tbW("Failed", "kubelet", 'Error: failed to create containerd task: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: exec: "pyhton": executable file not found in $PATH: unknown'), tbW("BackOff", "kubelet", "Back-off restarting failed container web")],
    why: "command/args gõ sai hoặc image không có binary đó (image distroless không có sh).",
    chk: "k get pod web-7c9d-x2 -o jsonpath='{.spec.containers[0].command}'", fix: "Sửa command trong Deployment:\nk edit deploy web      # command: [\"python\", \"app.py\"]" },

  { id: "crash", g: "crash", st: "CrashLoopBackOff", t: "Ứng dụng thoát lỗi (exit 1)", at: 8, loop: 1,
    seq: [tbS("ContainerCreating"), tbS("Running", "1/1", 0), tbS("Error", "0/1", 0), tbS("CrashLoopBackOff", "0/1", 1), tbS("Error", "0/1", 2), tbS("CrashLoopBackOff", "0/1", 2)],
    ev: [TB_SCHED, TB_PULLED("api:1.4"), TB_CREATED(), TB_STARTED(), tbW("BackOff", "kubelet", "Back-off restarting failed container web in pod web-7c9d-x2_default")],
    logs: "Error: DATABASE_URL is not set\nexit status 1",
    why: "Container chạy rồi thoát với mã khác 0; kubelet khởi động lại với back-off tăng dần. CrashLoopBackOff không phải phase: phase vẫn là Running.",
    chk: "k logs web-7c9d-x2 --previous\nk describe pod web-7c9d-x2 | grep -A5 'Last State'", fix: "Sửa nguyên nhân trong log (ở đây: thêm biến môi trường):\nk set env deploy/web DATABASE_URL=postgres://db:5432/app" },
  { id: "oom", g: "crash", st: "OOMKilled", t: "Vượt memory limit (exit 137)", at: 8, loop: 1,
    seq: [tbS("ContainerCreating"), tbS("Running", "1/1", 0), tbS("OOMKilled", "0/1", 0), tbS("CrashLoopBackOff", "0/1", 1), tbS("OOMKilled", "0/1", 2)],
    ev: [TB_SCHED, TB_PULLED("api:1.4"), TB_CREATED(), TB_STARTED(), tbW("BackOff", "kubelet", "Back-off restarting failed container web")],
    logs: "Last State: Terminated\n  Reason: OOMKilled\n  Exit Code: 137",
    why: "Tiến trình dùng nhiều RAM hơn limits.memory; kernel giết bằng SIGKILL (128 + 9 = 137).",
    chk: "k describe pod web-7c9d-x2 | grep -A4 'Last State'\nk top pod web-7c9d-x2 --containers", fix: "k set resources deploy/web --limits=memory=1Gi --requests=memory=768Mi\n# hoặc giới hạn heap của ứng dụng (JVM: -XX:MaxRAMPercentage=75)" },
  { id: "completed", g: "crash", st: "Completed", t: "Lệnh chạy xong rồi thoát (exit 0)", at: 8, loop: 1,
    seq: [tbS("ContainerCreating"), tbS("Completed", "0/1", 0), tbS("CrashLoopBackOff", "0/1", 1), tbS("Completed", "0/1", 2)],
    ev: [TB_SCHED, TB_PULLED("busybox:1.36"), TB_CREATED(), TB_STARTED(), tbW("BackOff", "kubelet", "Back-off restarting failed container web")],
    why: "Container chạy xong (ví dụ echo hello) và thoát 0, nhưng Deployment có restartPolicy Always nên bị chạy lại mãi.",
    chk: "k get pod web-7c9d-x2 -o jsonpath='{.spec.containers[0].command}'", fix: "Việc chạy một lần thì dùng Job; còn nếu cần chạy mãi thì sửa command thành tiến trình chạy lâu (ví dụ thêm sleep infinity khi debug)." },
  { id: "live", g: "crash", st: "Running (RESTARTS tăng)", t: "Liveness probe sai, bị giết liên tục", at: 9, loop: 1,
    seq: [tbS("ContainerCreating"), tbS("Running", "1/1", 0), tbS("Running", "1/1", 1), tbS("Running", "1/1", 2), tbS("CrashLoopBackOff", "0/1", 3)],
    ev: [TB_SCHED, TB_PULLED("nginx:1.27"), TB_CREATED(), TB_STARTED(), tbW("Unhealthy", "kubelet", "Liveness probe failed: HTTP probe failed with statuscode: 404"), tbN("Killing", "kubelet", "Container web failed liveness probe, will be restarted")],
    why: "Probe gọi sai path/port hoặc quá gắt so với thời gian khởi động; kubelet giết container đang chạy bình thường (exit 143 hoặc 137).",
    chk: "k describe pod web-7c9d-x2 | grep -i -A3 liveness\nk exec web-7c9d-x2 -- wget -qO- localhost:80/healthz", fix: "Sửa path/port của livenessProbe, thêm startupProbe cho ứng dụng khởi động chậm,\ntăng failureThreshold; đừng cho liveness kiểm database." },
  { id: "ready", g: "crash", st: "Running 0/1", t: "Readiness probe trượt, Service không có endpoint", at: 10,
    seq: [tbS("ContainerCreating"), tbS("Running", "0/1", 0), tbS("Running", "0/1", 0)],
    ev: [TB_SCHED, TB_PULLED("api:1.4"), TB_CREATED(), TB_STARTED(), tbW("Unhealthy", "kubelet", 'Readiness probe failed: Get "http://10.244.1.12:8080/ready": dial tcp 10.244.1.12:8080: connect: connection refused')],
    why: "Container chạy nhưng không Ready nên bị rút khỏi EndpointSlice; gọi Service thấy connection refused. Readiness không restart container.",
    chk: "k get endpointslices -l kubernetes.io/service-name=web\nk exec web-7c9d-x2 -- ss -tlnp", fix: "Sửa port/path readinessProbe cho khớp port ứng dụng đang nghe (ở đây ứng dụng nghe 9898, không phải 8080)." },
  { id: "init", g: "crash", st: "Init:CrashLoopBackOff", t: "Init container thất bại", at: 8, loop: 1,
    seq: [tbS("Init:0/1"), tbS("Init:Error"), tbS("Init:CrashLoopBackOff", "0/1", 1), tbS("Init:Error", "0/1", 2)],
    ev: [TB_SCHED, TB_PULLED("migrate:1.4"), TB_CREATED("migrate"), TB_STARTED("migrate"), tbW("BackOff", "kubelet", "Back-off restarting failed container migrate in pod web-7c9d-x2_default")],
    logs: "k logs web-7c9d-x2 -c migrate\nerror: migration 0042 failed: relation \"orders\" already exists",
    why: "Init container phải thoát 0 thì container chính mới chạy. Nó lỗi nên Pod kẹt ở Init.",
    chk: "k logs web-7c9d-x2 -c migrate --previous\nk describe pod web-7c9d-x2 | sed -n '/Init Containers/,/Containers:/p'", fix: "Sửa lỗi của init container (ở đây: migration), rồi rollout lại." },
  { id: "initwait", g: "crash", st: "Init:0/1", t: "Init container chờ mãi", at: 8,
    seq: [tbS("Init:0/1"), tbS("Init:0/1"), tbS("Init:0/1")],
    ev: [TB_SCHED, TB_PULLED("busybox:1.36"), TB_CREATED("wait-db"), TB_STARTED("wait-db")],
    logs: "k logs web-7c9d-x2 -c wait-db\nwaiting for db\nwaiting for db\nwaiting for db",
    why: "Init chạy vòng until nslookup db; Service db chưa có (hoặc sai namespace) nên không bao giờ thoát.",
    chk: "k logs web-7c9d-x2 -c wait-db\nk get svc db", fix: "Tạo Service db (hoặc sửa tên trong init: db.<namespace>)." },

  { id: "cpu", g: "sched", st: "Pending", t: "Không đủ CPU", at: 3,
    seq: [tbS("Pending"), tbS("Pending")],
    ev: [tbW("FailedScheduling", "default-scheduler", "0/3 nodes are available: 1 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }, 2 Insufficient cpu. preemption: 0/3 nodes are available: 1 Preemption is not helpful for scheduling, 2 No preemption victims found for incoming pod.")],
    why: "Tổng requests.cpu của Pod lớn hơn phần còn trống (allocatable trừ requests đã dùng) của mọi node. Scheduler so requests, không so mức dùng thật.",
    chk: "k describe node node01 | sed -n '/Allocated resources/,/Events/p'\nk get pod web-7c9d-x2 -o jsonpath='{.spec.containers[*].resources}'", fix: "Giảm requests: k set resources deploy/web --requests=cpu=200m\nhoặc thêm node, dọn Pod thừa; kiểm LimitRange có đặt requests mặc định quá lớn không." },
  { id: "taint", g: "sched", st: "Pending", t: "Node có taint, Pod không toleration", at: 3,
    seq: [tbS("Pending"), tbS("Pending")],
    ev: [tbW("FailedScheduling", "default-scheduler", "0/3 nodes are available: 3 node(s) had untolerated taint {gpu: true}. preemption: 0/3 nodes are available: 3 Preemption is not helpful for scheduling.")],
    why: "Mọi node đều có taint mà Pod không chịu được.", chk: "k describe nodes | grep -i taints", fix: "Thêm toleration vào Pod:\n  tolerations: [{key: gpu, operator: Equal, value: \"true\", effect: NoSchedule}]\nhoặc gỡ taint: k taint node node01 gpu=true:NoSchedule-" },
  { id: "affinity", g: "sched", st: "Pending", t: "nodeSelector/affinity không khớp node nào", at: 3,
    seq: [tbS("Pending"), tbS("Pending")],
    ev: [tbW("FailedScheduling", "default-scheduler", "0/3 nodes are available: 1 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }, 2 node(s) didn't match Pod's node affinity/selector. preemption: 0/3 nodes are available: 3 Preemption is not helpful for scheduling.")],
    why: "Pod đòi label (ví dụ disktype=ssd) mà không node nào có.", chk: "k get pod web-7c9d-x2 -o jsonpath='{.spec.nodeSelector}'\nk get nodes --show-labels", fix: "k label node node01 disktype=ssd\n# hoặc sửa nodeSelector/affinity của Pod" },
  { id: "pvc", g: "sched", st: "Pending", t: "PVC chưa Bound", at: 3,
    seq: [tbS("Pending"), tbS("Pending")],
    ev: [tbW("FailedScheduling", "default-scheduler", "0/3 nodes are available: pod has unbound immediate PersistentVolumeClaims. preemption: 0/3 nodes are available: 3 Preemption is not helpful for scheduling.")],
    logs: "k describe pvc data\n  Warning  ProvisioningFailed  persistentvolume-controller  storageclass.storage.k8s.io \"fast\" not found",
    why: "PVC chưa gắn được PV: StorageClass sai tên, không có StorageClass mặc định, hoặc PV tạo tay không khớp dung lượng/accessModes.",
    chk: "k get pvc,pv\nk describe pvc data\nk get sc", fix: "Sửa storageClassName của PVC cho đúng (PVC không sửa được trường này: xóa rồi tạo lại),\nhoặc tạo PV khớp." },
  { id: "nosched", g: "sched", st: "Pending", t: "Scheduler không chạy (không có event)", at: 3,
    seq: [tbS("Pending"), tbS("Pending"), tbS("Pending")],
    ev: [],
    why: "Không ai xếp lịch nên không có cả event FailedScheduling; NODE là <none>. Thường do manifest kube-scheduler bị sửa sai.",
    chk: "k -n kube-system get pod -l component=kube-scheduler\nsudo crictl ps -a | grep scheduler\nsudo crictl logs <id>", fix: "Sửa /etc/kubernetes/manifests/kube-scheduler.yaml; kubelet tự tạo lại static Pod.\nNếu Pod có schedulerName lạ thì sửa về default-scheduler." },
  { id: "outofcpu", g: "sched", st: "OutOfcpu", t: "Gán nodeName tay, node không đủ CPU", at: 4,
    seq: [tbS("OutOfcpu")],
    ev: [tbW("OutOfcpu", "kubelet", "Node didn't have enough resource: cpu, requested: 4000, used: 1200, capacity: 2000")],
    why: "spec.nodeName bỏ qua scheduler; kubelet tự kiểm tài nguyên lúc nhận Pod và từ chối.", chk: "k get pod web-7c9d-x2 -o jsonpath='{.spec.nodeName}'", fix: "Bỏ nodeName, dùng nodeSelector/affinity để scheduler kiểm tài nguyên; hoặc giảm requests." },

  { id: "quota", g: "adm", st: "(không có Pod)", t: "Vượt ResourceQuota", at: 2,
    term: ["$ k get pods", "No resources found in default namespace.", "", "$ k get deploy web", "NAME   READY   UP-TO-DATE   AVAILABLE   AGE", "web    0/3     0            0           40s"],
    ev: [tbW("FailedCreate", "replicaset-controller", 'Error creating: pods "web-7c9d-x2" is forbidden: exceeded quota: compute, requested: requests.cpu=500m, used: requests.cpu=1800m, limited: requests.cpu=2')],
    evCmd: "k describe rs -l app=web | tail -3",
    why: "apiserver từ chối tạo Pod vì quota của namespace không đủ. Không có Pod nào nên describe pod không giúp gì: xem event của ReplicaSet.",
    chk: "k describe quota -n default\nk describe rs -l app=web | tail", fix: "Giảm requests hoặc số bản sao, hoặc tăng quota:\nk edit quota compute -n default" },
  { id: "psa", g: "adm", st: "(không có Pod)", t: "Pod Security restricted chặn", at: 2,
    term: ["$ k get pods -n prod", "No resources found in prod namespace.", "", "$ k get deploy web -n prod", "NAME   READY   UP-TO-DATE   AVAILABLE   AGE", "web    0/2     0            0           25s"],
    ev: [tbW("FailedCreate", "replicaset-controller", 'Error creating: pods "web-7c9d-x2" is forbidden: violates PodSecurity "restricted:latest": allowPrivilegeEscalation != false (container "web" must set securityContext.allowPrivilegeEscalation=false), unrestricted capabilities (container "web" must set securityContext.capabilities.drop=["ALL"]), runAsNonRoot != true (pod or container "web" must set securityContext.runAsNonRoot=true), seccompProfile (pod or container "web" must set securityContext.seccompProfile.type to "RuntimeDefault" or "Localhost")')],
    evCmd: "k describe rs -n prod -l app=web | tail -3",
    why: "Namespace có label pod-security.kubernetes.io/enforce=restricted; Pod thiếu securityContext tương ứng.",
    chk: "k get ns prod --show-labels\nk describe rs -n prod -l app=web | tail", fix: "Thêm securityContext: runAsNonRoot: true, allowPrivilegeEscalation: false,\ncapabilities.drop: [ALL], seccompProfile.type: RuntimeDefault (xem examples/web-api)." },
  { id: "noreq", g: "adm", st: "(không có Pod)", t: "Không khai requests, namespace có quota", at: 2,
    term: ["$ k get pods -n shop", "No resources found in shop namespace.", "", "$ k get deploy web -n shop", "NAME   READY   UP-TO-DATE   AVAILABLE   AGE", "web    0/3     0            0           30s"],
    ev: [tbW("FailedCreate", "replicaset-controller", 'Error creating: pods "web-7c9d-x2" is forbidden: failed quota: compute: must specify limits.memory for: web; requests.cpu for: web; requests.memory for: web')],
    evCmd: "k describe rs -n shop -l app=web | tail -3",
    why: "Namespace có ResourceQuota cho CPU/RAM thì mọi Pod phải khai các trường đó. Không có LimitRange để tự điền nên apiserver từ chối.",
    chk: "k describe quota -n shop\nk get limitrange -n shop", fix: "k set resources deploy/web -n shop --requests=cpu=200m,memory=256Mi --limits=memory=256Mi\n# hoặc tạo LimitRange có defaultRequest và default cho namespace" },
  { id: "rolloutq", g: "adm", st: "Rollout đứng yên", t: "Hết quota cho Pod surge khi rollout", at: 2,
    term: ["$ k rollout status deploy/web -n shop", "Waiting for deployment \"web\" rollout to finish: 0 of 4 updated replicas are available...", "", "$ k get rs -n shop", "NAME             DESIRED   CURRENT   READY   AGE", "web-7c9d   4         4         4       3d", "web-5f8b   1         0         0       2m"],
    ev: [tbW("FailedCreate", "replicaset-controller", 'Error creating: pods "web-5f8b-q1" is forbidden: exceeded quota: compute, requested: requests.cpu=500m, used: requests.cpu=2, limited: requests.cpu=2')],
    evCmd: "k describe rs web-5f8b -n shop | tail -3",
    why: "4 Pod cũ đã dùng đúng bằng quota. Rolling update phải tạo Pod mới (maxSurge) trước khi xóa Pod cũ, nhưng không còn quota.",
    chk: "k describe quota -n shop\nk get deploy web -n shop -o jsonpath='{.spec.strategy}'", fix: "k patch deploy web -n shop -p '{\"spec\":{\"strategy\":{\"rollingUpdate\":{\"maxSurge\":0,\"maxUnavailable\":1}}}}'\n# hoặc tăng quota để chừa chỗ cho Pod surge" },
  { id: "lrmax", g: "adm", st: "(không có Pod)", t: "Vượt max của LimitRange", at: 1,
    term: ["$ k get pods -n shop", "No resources found in shop namespace.", "", "$ k get deploy web -n shop", "NAME   READY   UP-TO-DATE   AVAILABLE   AGE", "web    0/2     0            0           15s"],
    ev: [tbW("FailedCreate", "replicaset-controller", 'Error creating: pods "web-7c9d-x2" is forbidden: maximum cpu usage per Container is 2, but limit is 4')],
    evCmd: "k describe rs -n shop -l app=web | tail -3",
    why: "LimitRange đặt max cpu 2 cho mỗi container; Pod xin limits.cpu 4 nên bị admission từ chối.",
    chk: "k describe limitrange -n shop", fix: "k set resources deploy/web -n shop --limits=cpu=2\n# hoặc sửa LimitRange nếu workload thật sự cần nhiều hơn" },
  { id: "webhook", g: "adm", st: "(không tạo được)", t: "Admission webhook chết", at: 1,
    term: ["$ k apply -f deploy.yaml", 'Error from server (InternalError): error when creating "deploy.yaml": Internal error occurred: failed calling webhook "validate.kyverno.svc": failed to call webhook: Post "https://kyverno-svc.kyverno.svc:443/validate?timeout=10s": dial tcp 10.96.80.4:443: connect: connection refused'],
    ev: [], evCmd: "(lỗi trả thẳng cho kubectl, không có event)",
    why: "Webhook có failurePolicy: Fail mà Pod webhook không chạy: apiserver từ chối luôn.",
    chk: "k get validatingwebhookconfigurations\nk -n kyverno get pod,endpointslices", fix: "Đưa Pod webhook chạy lại. Khẩn cấp: tạm đổi failurePolicy sang Ignore (nhớ trả lại)." },

  { id: "cni", g: "node", st: "ContainerCreating", t: "CNI lỗi, không tạo được sandbox", at: 5,
    seq: [tbS("ContainerCreating"), tbS("ContainerCreating"), tbS("ContainerCreating")],
    ev: [TB_SCHED, tbW("FailedCreatePodSandBox", "kubelet", 'Failed to create pod sandbox: rpc error: code = Unknown desc = failed to setup network for sandbox "4f1c…": plugin type="calico" failed (add): stat /var/lib/calico/nodename: no such file or directory: check that the calico/node container is running and has mounted /var/lib/calico/')],
    why: "Pod calico-node trên node01 không chạy nên CNI không cấp được IP.", chk: "k -n calico-system get pod -o wide | grep node01\nk -n calico-system logs ds/calico-node -c calico-node | tail", fix: "Sửa Pod calico-node trên node đó (thường: không tới được apiserver, sai interface IP)." },
  { id: "multiattach", g: "node", st: "ContainerCreating", t: "Volume RWO đang gắn ở node khác", at: 4,
    seq: [tbS("ContainerCreating"), tbS("ContainerCreating")],
    ev: [TB_SCHED, tbW("FailedAttachVolume", "attachdetach-controller", 'Multi-Attach error for volume "pvc-3f1a…" Volume is already exclusively attached to one node and can\'t be attached to another')],
    why: "PVC ReadWriteOnce còn gắn ở node cũ (Pod cũ chưa xóa xong, hoặc node cũ chết).", chk: "k get volumeattachments\nk get pod -o wide -l app=db", fix: "Chờ Pod cũ xóa xong; node cũ chết thì xóa Pod cũ (--force) để controller tháo volume.\nCần nhiều node cùng ghi: dùng ReadWriteMany." },
  { id: "evicted", g: "node", st: "Evicted", t: "Node hết đĩa, Pod bị đuổi", at: 4, late: 1,
    seq: [tbS("ContainerCreating"), tbS("Running", "1/1", 0), tbS("Evicted", "0/1", 0)],
    ev: [TB_SCHED, TB_STARTED(), tbW("Evicted", "kubelet", "The node was low on resource: ephemeral-storage. Threshold quantity: 1Gi, available: 512Mi. Container web was using 3Gi, request is 0, has larger consumption of ephemeral-storage.")],
    why: "Node vượt ngưỡng eviction (đĩa hoặc RAM); kubelet đuổi Pod, ưu tiên Pod dùng vượt requests.", chk: "k describe node node01 | grep -i pressure\ndf -h /var/lib/kubelet /var/lib/containerd", fix: "Dọn đĩa (image, log), đặt requests/limits ephemeral-storage, ghi dữ liệu lớn ra volume.\nXóa Pod Evicted cũ: k delete pod --field-selector=status.phase=Failed" },
  { id: "nodedown", g: "node", st: "Terminating", t: "Node chết, Pod kẹt Terminating", at: 4, late: 1,
    seq: [tbS("Running", "1/1", 0), tbS("Running", "1/1", 0), tbS("Terminating", "1/1", 0)],
    ev: [tbW("NodeNotReady", "node-controller", "Node is not ready"), tbN("TaintManagerEviction", "taint-eviction-controller", "Marking for deletion Pod default/web-7c9d-x2")],
    why: "Node mất liên lạc: sau 5 phút (toleration unreachable 300s) Pod bị đánh dấu xóa, nhưng kubelet chết nên không ai xác nhận: kẹt Terminating. Deployment đã tạo Pod mới ở node khác.",
    chk: "k get nodes\nk get pod -o wide | grep node01", fix: "Sửa node, hoặc nếu node mất hẳn: k delete node node01 (Pod sẽ được dọn).\nk delete pod web-7c9d-x2 --force --grace-period=0   # cẩn thận với StatefulSet" },
  { id: "job", g: "node", st: "Error", t: "Job hết số lần thử (BackoffLimitExceeded)", at: 8, loop: 1,
    seq: [tbS("Error", "0/1", 0), tbS("Error", "0/1", 0), tbS("Error", "0/1", 0)],
    term: ["$ k get pods -l job-name=report", "NAME           READY   STATUS   RESTARTS   AGE", "report-8kq2l   0/1     Error    0          2m", "report-x7c4m   0/1     Error    0          110s", "report-p2n9d   0/1     Error    0          70s", "", "$ k get job report", "NAME     STATUS   COMPLETIONS   DURATION   AGE", "report   Failed   0/1           2m         2m"],
    ev: [tbN("SuccessfulCreate", "job-controller", "Created pod: report-8kq2l"), tbN("SuccessfulCreate", "job-controller", "Created pod: report-x7c4m"), tbW("BackoffLimitExceeded", "job-controller", "Job has reached the specified backoff limit")],
    evCmd: "k describe job report | tail -4",
    why: "Mỗi lần Pod của Job thất bại, controller tạo Pod mới; hết backoffLimit thì Job Failed.", chk: "k logs job/report\nk describe job report", fix: "Sửa lỗi trong log, rồi xóa Job và tạo lại (Job không tự chạy lại sau khi Failed)." }
];

let tbCur = "tag", tbRun = 0, tbGroup = "img";
const tbEsc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function tbStageSVG() {
  let s = '<svg viewBox="0 0 1100 150" role="img" aria-label="Các chặng một Pod đi qua">';
  s += '<line x1="50" y1="55" x2="1050" y2="55" class="sv-wire"/>';
  TB_STAGES.forEach((st, i) => {
    const x = 50 + i * 100;
    s += '<g class="tb-st" id="tbS' + i + '"><circle cx="' + x + '" cy="55" r="17"/><text x="' + x + '" y="60" text-anchor="middle" class="tb-n">' + (i + 1) + '</text><path class="tb-x" d="M' + (x - 7) + " 48 l14 14 M" + (x + 7) + " 48 l-14 14\"/>" +
      '<text x="' + x + '" y="97" text-anchor="middle" class="sv-t tb-l">' + tbEsc(st[0]) + '</text><text x="' + x + '" y="115" text-anchor="middle" class="sv-s">' + tbEsc(st[1]) + "</text></g>";
  });
  s += '<g id="tbTok" transform="translate(50 20)"><rect x="-22" y="-12" width="44" height="22" rx="6"/><text y="4" text-anchor="middle">Pod</text></g>';
  s += '<text id="tbBack" x="550" y="142" text-anchor="middle" class="sv-s"></text></svg>';
  return s;
}
function tbInit() {
  const host = $("#tbSim"); if (!host || host.dataset.ready) return;
  host.dataset.ready = "1";
  host.innerHTML =
    '<div class="seg" id="tbGroups" role="group" aria-label="Nhóm lỗi">' + TB_GROUPS.map(g => '<button type="button" data-tg="' + g[0] + '" aria-pressed="false">' + tbEsc(g[1]) + ' <span class="cnt">' + TB_ERRS.filter(e => e.g === g[0]).length + "</span></button>").join("") + "</div>" +
    '<div class="tb-chips" id="tbChips"></div>' +
    '<div class="stage tb-stage">' + tbStageSVG() + "</div>" +
    '<div class="controls"><button class="btn" type="button" id="tbReplay">↺ Chạy lại</button><button class="btn primary" type="button" id="tbFix">✓ Áp dụng cách sửa</button><span class="hint" id="tbCap" aria-live="polite"></span></div>' +
    '<div class="split even"><div class="col"><span class="tb-h">kubectl get pod -w</span><div class="term tb-term" id="tbTerm"></div></div><div class="col"><span class="tb-h" id="tbEvH">kubectl describe pod · Events</span><div class="term tb-term" id="tbEv"></div></div></div>' +
    '<div id="tbFixBox" class="tb-fix" hidden></div>';
  host.addEventListener("click", e => {
    const g = e.target.closest("[data-tg]"); if (g) { tbGroup = g.dataset.tg; tbChips(); const first = TB_ERRS.find(x => x.g === tbGroup); tbCur = first.id; tbChips(); tbPlay(); return; }
    const c = e.target.closest("[data-te]"); if (c) { tbCur = c.dataset.te; store.set("tbErr", tbCur); tbChips(); tbPlay(); return; }
    if (e.target.closest("#tbReplay")) tbPlay();
    if (e.target.closest("#tbFix")) tbPlay(true);
  });
  tbCur = store.get("tbErr", "tag"); const ce = TB_ERRS.find(x => x.id === tbCur) || TB_ERRS[0]; tbCur = ce.id; tbGroup = ce.g;
  tbChips(); tbPlay();
}
function tbChips() {
  $$("#tbGroups button").forEach(b => b.setAttribute("aria-pressed", b.dataset.tg === tbGroup ? "true" : "false"));
  $("#tbChips").innerHTML = TB_ERRS.filter(e => e.g === tbGroup).map(e => '<button type="button" data-te="' + e.id + '" aria-pressed="' + (e.id === tbCur) + '"><b>' + tbEsc(e.st) + "</b><span>" + tbEsc(e.t) + "</span></button>").join("");
}
function tbMoveTok(x, dur) {
  const tok = $("#tbTok"); if (!tok) return Promise.resolve();
  const m = /translate\(([-\d.]+)/.exec(tok.getAttribute("transform")); const x0 = m ? +m[1] : 50;
  if (RM) { tok.setAttribute("transform", "translate(" + x + " 20)"); return Promise.resolve(); }
  const t0 = performance.now();
  return new Promise(res => { const f = t => { const p = Math.min(1, (t - t0) / dur); tok.setAttribute("transform", "translate(" + (x0 + (x - x0) * ease(p)) + " 20)"); if (p < 1 && tok.isConnected) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
}
const tbAge = k => (k * 12 + 3) + "s";
let tbStW = 20;
const tbHead = name => { const pad = (x, n) => (x + " ".repeat(n)).slice(0, n); return pad("NAME", name.length + 2) + pad("READY", 7) + pad("STATUS", tbStW) + pad("RESTARTS", 10) + "AGE"; };
function tbPodRow(r, k, name) { const pad = (s, n) => (s + " ".repeat(n)).slice(0, Math.max(n, s.length + 1)); return pad(name, name.length + 2) + pad(r[1], 7) + pad(r[0], tbStW) + pad(String(r[2]), 10) + tbAge(k); }
async function tbPlay(fixed) {
  const run = ++tbRun, e = TB_ERRS.find(x => x.id === tbCur); if (!e) return;
  const term = $("#tbTerm"), evb = $("#tbEv"), cap = $("#tbCap"), fb = $("#tbFixBox"), tok = $("#tbTok"), back = $("#tbBack");
  const alive = () => run === tbRun && term.isConnected;
  const name = e.id === "job" ? "report-8kq2l" : "web-7c9d-x2";
  tbStW = Math.max(8, ...(e.seq || []).map(r => r[0].length), fixed ? 17 : 0) + 2;
  $$(".tb-st").forEach(g => g.setAttribute("class", "tb-st")); tok.setAttribute("class", ""); back.textContent = "";
  tok.setAttribute("transform", "translate(50 20)");
  fb.hidden = true; $("#tbFix").disabled = false;
  term.innerHTML = '<span class="dim">$ k ' + (e.term && !fixed ? "…" : "get pod -w") + "</span>\n"; evb.innerHTML = "";
  $("#tbEvH").textContent = e.evCmd && !fixed ? e.evCmd : "kubectl describe pod " + name + " · Events";
  if (!fixed && !e.term) term.innerHTML += '<span class="dim">' + tbEsc(tbHead(name)) + "</span>\n";
  const line = (box, html) => { box.innerHTML += html + "\n"; box.scrollTop = box.scrollHeight; };
  const evLine = v => line(evb, '<span class="' + (v[0] === "Warning" ? "bad" : "ok") + '">' + v[0].padEnd(8) + "</span> " + tbEsc(v[1].padEnd(18)) + ' <span class="dim">' + tbEsc(v[2]) + "</span>  " + tbEsc(v[3]));
  const end = fixed ? TB_STAGES.length - 1 : e.late ? TB_STAGES.length - 1 : e.at;
  cap.textContent = fixed ? "Sau khi sửa: Pod đi hết các chặng." : "Pod đang đi qua các chặng…";
  let k = 0;
  for (let i = 0; i <= end; i++) {
    if (!alive()) return;
    await tbMoveTok(50 + i * 100, 260);
    const st = $("#tbS" + i);
    if (!fixed && !e.late && i === e.at) break;
    st.setAttribute("class", "tb-st ok");
    await sleep(70);
  }
  if (fixed) {
    tok.setAttribute("class", "ok");
    if (e.term) { term.innerHTML = '<span class="dim">$ k get pod -w</span>\n'; }
    line(term, '<span class="dim">' + tbEsc(tbHead(name)) + "</span>");
    for (const [i, r] of [["ContainerCreating", "0/1", 0], ["Running", "1/1", 0]].entries()) { if (!alive()) return; line(term, tbEsc(tbPodRow(r, i, name))); await sleep(400); }
    [TB_SCHED, TB_PULLED("…"), TB_CREATED(), TB_STARTED()].forEach(evLine);
    cap.textContent = "Running 1/1: Pod đã Ready và nằm trong EndpointSlice của Service.";
    return;
  }
  /* chặng hỏng */
  const fail = async () => { const st = $("#tbS" + e.at); st.setAttribute("class", "tb-st bad"); tok.setAttribute("class", "bad"); };
  if (e.late) {
    tok.setAttribute("class", "ok"); await sleep(500);
    await tbMoveTok(50 + e.at * 100, 700);
  }
  await fail();
  const seq = e.seq || [];
  let evI = 0;
  const evPer = Math.max(1, Math.ceil(e.ev.length / Math.max(1, (e.term ? 1 : seq.length))));
  if (e.term) { term.innerHTML = ""; for (const l of e.term) { if (!alive()) return; line(term, l.startsWith("$") ? '<span class="p">' + tbEsc(l) + "</span>" : /Error|forbidden|Failed/.test(l) ? '<span class="bad">' + tbEsc(l) + "</span>" : tbEsc(l)); await sleep(160); } }
  for (let s = 0; s < Math.max(seq.length, e.term ? 1 : 0); s++) {
    if (!alive()) return;
    if (!e.term && seq[s]) {
      const r = seq[s], bad = /Err|BackOff|Error|Invalid|OOM|Evicted|OutOf|Completed|Terminating/.test(r[0]) || (r[0] === "Running" && r[2] > 0) || /^Init|Pending|Creating/.test(r[0]) && s > 0;
      line(term, (bad ? '<span class="bad">' : "") + tbEsc(tbPodRow(r, s, name)) + (bad ? "</span>" : ""));
    }
    for (let q = 0; q < evPer && evI < e.ev.length; q++) evLine(e.ev[evI++]);
    if (e.loop && s > 0 && !RM) {
      const wait = [10, 20, 40, 80, 160][Math.min(4, s - 1)];
      back.textContent = "back-off " + wait + "s rồi thử lại…";
      await tbMoveTok(50 + Math.max(0, e.at - 1) * 100, 260); await tbMoveTok(50 + e.at * 100, 260);
    }
    await sleep(RM ? 50 : 650);
  }
  while (evI < e.ev.length) evLine(e.ev[evI++]);
  if (!e.ev.length) line(evb, '<span class="dim">' + (e.evCmd ? "" : "Events:  <none>") + "</span>");
  if (e.logs) { line(evb, ""); line(evb, '<span class="p">' + (e.logs.startsWith("k ") || e.logs.startsWith("Last") ? "" : "$ k logs " + name + " --previous") + "</span>"); e.logs.split("\n").forEach(l => line(evb, l.startsWith("k ") ? '<span class="p">$ ' + tbEsc(l) + "</span>" : '<span class="bad">' + tbEsc(l) + "</span>")); }
  back.textContent = "";
  cap.innerHTML = 'Hỏng ở chặng <b>' + (e.at + 1) + " · " + tbEsc(TB_STAGES[e.at][0]) + "</b> (" + tbEsc(TB_STAGES[e.at][1]) + ").";
  fb.innerHTML = '<div class="take">' + tbEsc(e.why) + '</div><div class="split even"><div class="col"><span class="tb-h">Kiểm tra</span>' + wCode(e.chk) + '</div><div class="col"><span class="tb-h ok">Cách sửa</span>' + wCode(e.fix) + "</div></div>";
  fb.hidden = false; wireCopyIn(fb);
}
function wireCopyIn(root) { $$("pre.code", root).forEach(pre => { if (pre.parentElement.querySelector(".copy")) return; const b = document.createElement("button"); b.className = "copy"; b.type = "button"; b.textContent = "Chép"; b.onclick = () => { try { navigator.clipboard.writeText(pre.textContent); b.textContent = "Đã chép"; } catch (e) {} setTimeout(() => b.textContent = "Chép", 1200); }; pre.parentElement.appendChild(b); }); }
{ const prev = onShow.trouble; onShow.trouble = () => { if (prev) prev(); tbInit(); }; }
if (current === "trouble" || (location.hash || "").slice(1) === "trouble") tbInit();
