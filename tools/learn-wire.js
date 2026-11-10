/* ---------- Giao tiếp & mã hóa: các thành phần nói gì với nhau, đóng gói và mã hóa ra sao ---------- */
/* Nguồn của mục "Giao tiếp & mã hóa" trong learn.html. build.py chèn file này vào trang.
   Mẫu gói tin đánh dấu "bắt thật" lấy từ cluster lab (k3s v1.34, Flannel VXLAN); phần còn lại theo cluster kubeadm. */

const WIRE_CONNS = [
  {
    id: "kubectl", n: 1, t: "kubectl → kube-apiserver", p: "TCP 6443", tr: "TLS 1.3 · HTTP/2", fm: "protobuf hoặc JSON", cr: ["ok", "TLS"], au: "client cert, token, OIDC",
    what: "Mọi lệnh kubectl là một request REST: verb HTTP + đường dẫn tài nguyên. <code>kubectl create</code> là <code>POST /apis/apps/v1/namespaces/default/deployments</code>, <code>get</code> là <code>GET …?limit=500</code>, <code>apply</code> là <code>PATCH</code> (server-side apply), <code>-w</code> là <code>GET …?watch=true</code> giữ kết nối mở. Phản hồi là object, danh sách, bảng (Table) hoặc <code>Status</code> khi lỗi.",
    fmt: "kubectl đời mới gửi và nhận <b>protobuf</b> (<code>application/vnd.kubernetes.protobuf</code>) cho kiểu có sẵn, JSON cho CRD. Lệnh <code>get</code> xin dạng bảng: <code>Accept: application/json;as=Table;v=v1;g=meta.k8s.io</code>. Body protobuf bắt đầu bằng 4 byte magic <code>6b 38 73 00</code> (<code>k8s\\0</code>).",
    sec: "TLS (1.3 nếu hai bên hỗ trợ, ví dụ <code>TLS_AES_128_GCM_SHA256</code>). kubectl kiểm chứng chỉ server bằng <code>certificate-authority-data</code> trong kubeconfig và so tên/IP đang gọi với SAN của <code>apiserver.crt</code>. Ai bắt gói chỉ thấy IP, cổng, SNI và kích thước gói.",
    auth: "Server chứng minh danh tính bằng chứng chỉ. Client chứng minh bằng một trong: <b>client certificate</b> (admin.conf: CN=<code>kubernetes-admin</code> → user, O=<code>kubeadm:cluster-admins</code> → group), <b>Bearer token</b> (ServiceAccount, OIDC id_token) hoặc exec plugin của cloud (<code>aws eks get-token</code>, <code>gke-gcloud-auth-plugin</code>). Sau đó mới tới phân quyền (RBAC) và admission.",
    cfg: "<code>~/.kube/config</code> (cluster, user, context). Phía server: <code>--tls-cert-file</code>, <code>--tls-private-key-file</code>, <code>--client-ca-file</code> trong <code>/etc/kubernetes/manifests/kube-apiserver.yaml</code>.",
    sample: `# Bắt bằng kubectl -v=8 (đã giải mã TLS, HTTP/2 viết lại cho dễ đọc)
:method      POST
:path        /apis/apps/v1/namespaces/default/deployments?fieldManager=kubectl-create&fieldValidation=Strict
content-type application/vnd.kubernetes.protobuf
accept       application/vnd.kubernetes.protobuf,application/json
user-agent   kubectl/v1.37.0 (linux/amd64)
# không có header authorization: danh tính nằm trong client certificate lúc bắt tay TLS

body: 6b 38 73 00 0a 15 0a 07 61 70 70 73 2f 76 31 12 0a 44 65 70 6c 6f 79 6d 65 6e 74 …
       k  8  s \\0          a  p  p  s  /  v  1        D  e  p  l  o  y  m  e  n  t

# Phản hồi
:status      201
content-type application/vnd.kubernetes.protobuf
audit-id     710c8eef-3235-4d16-9439-18ee4872eba8`,
    see: `kubectl create deploy web --image=nginx:1.27 -v=8     # header + body (rút gọn)
kubectl get pods -v=6                                  # chỉ URL và mã trạng thái
openssl s_client -connect 10.0.0.10:6443 -CAfile /etc/kubernetes/pki/ca.crt </dev/null 2>/dev/null \\
  | openssl x509 -noout -subject -ext subjectAltName  # cert server và SAN
kubectl config view --raw -o jsonpath='{.users[0].user.client-certificate-data}' \\
  | base64 -d | openssl x509 -noout -subject -enddate  # mình là ai, hết hạn khi nào
kubectl auth whoami`,
    traps: ["<code>x509: certificate signed by unknown authority</code>: kubeconfig mang CA khác với CA đã ký apiserver.crt.", "<code>certificate is valid for 10.0.0.10, not lb.lab</code>: tên đang gọi không có trong SAN. Thêm <code>certSANs</code> rồi tạo lại apiserver.crt.", "401 Unauthorized là <b>xác thực</b> thất bại (cert hết hạn, token sai). 403 Forbidden là đã biết bạn là ai nhưng RBAC không cho.", "Cert trong admin.conf hết hạn sau 1 năm cùng các cert khác: <code>kubeadm certs renew all</code> rồi chép lại admin.conf."],
    pk: "kubectl", labs: [2, 24, 31]
  },
  {
    id: "etcd", n: 2, t: "kube-apiserver → etcd", p: "TCP 2379", tr: "gRPC · HTTP/2", fm: "protobuf (k8s\\0)", cr: ["ok", "mTLS"], au: "cert hai chiều, CA riêng của etcd",
    what: "apiserver là thành phần <b>duy nhất</b> nói chuyện với etcd. Nó dùng KV API của etcd: <code>Range</code> (get, list), <code>Txn</code> (ghi có điều kiện), <code>Watch</code> (luồng thay đổi, nền của mọi watch trong cluster) và <code>Lease</code> (TTL, ví dụ Event tự hết hạn). Key có dạng <code>/registry/&lt;resource&gt;/&lt;namespace&gt;/&lt;name&gt;</code>.",
    fmt: "Value là object đã mã hóa protobuf, mở đầu bằng <code>k8s\\0</code> rồi <code>TypeMeta</code> (apiVersion, kind) và phần thân. Object của CRD lưu dạng JSON. Nếu bật EncryptionConfiguration, value bắt đầu bằng <code>k8s:enc:&lt;provider&gt;:v1:&lt;tên khóa&gt;:</code> và phần sau là ciphertext.",
    sec: "mTLS: cả hai đưa chứng chỉ do <b>etcd CA</b> (<code>/etc/kubernetes/pki/etcd/ca.crt</code>, khác CA của cluster) ký. TLS chỉ bảo vệ trên đường đi; etcd tự nó <b>không mã hóa</b> dữ liệu trên đĩa (<code>/var/lib/etcd/member/snap/db</code>) và trong file snapshot.",
    auth: "apiserver đưa <code>apiserver-etcd-client.crt</code>; etcd chạy với <code>--client-cert-auth=true</code> và chỉ tin <code>--trusted-ca-file=etcd/ca.crt</code>. Kubernetes không dùng phân quyền của etcd: ai có cert do etcd CA ký là đọc ghi được mọi thứ, kể cả Secret.",
    cfg: "kube-apiserver.yaml: <code>--etcd-servers</code>, <code>--etcd-cafile</code>, <code>--etcd-certfile</code>, <code>--etcd-keyfile</code>. etcd.yaml: <code>--cert-file</code>, <code>--key-file</code>, <code>--trusted-ca-file</code>, <code>--client-cert-auth</code>.",
    sample: `gRPC  /etcdserverpb.KV/Txn
compare: mod_revision("/registry/deployments/default/web") == 48212   # ai sửa trước thì Txn thất bại → 409 Conflict
success: put
  key   = /registry/deployments/default/web
  value = 6b 38 73 00 0a 15 0a 07 61 70 70 73 2f 76 31 12 0a 44 65 70 6c 6f 79 6d 65 6e 74 12 c8 0e …
          k8s\\0 | TypeMeta{apiVersion:"apps/v1", kind:"Deployment"} | raw: metadata, spec, status`,
    see: `sudo etcdctl --endpoints=https://127.0.0.1:2379 \\
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \\
  --cert=/etc/kubernetes/pki/apiserver-etcd-client.crt \\
  --key=/etc/kubernetes/pki/apiserver-etcd-client.key \\
  get /registry/deployments/default/web --print-value-only | hexdump -C | head
etcdctl … get /registry/ --prefix --keys-only | head     # (cùng tham số) xem cây key`,
    traps: ["Dùng nhầm <code>/etc/kubernetes/pki/ca.crt</code> cho etcdctl: etcd có CA riêng, sẽ báo <code>certificate signed by unknown authority</code>.", "Snapshot etcd chứa Secret ở dạng rõ nếu chưa bật mã hóa lúc lưu: bảo vệ file snapshot như bảo vệ mật khẩu.", "Ai lấy được <code>etcd/ca.key</code> là tự ký cert và có toàn quyền dữ liệu cluster."],
    pk: "etcd", labs: [29, 31]
  },
  {
    id: "raft", n: 3, t: "etcd ↔ etcd (peer)", p: "TCP 2380", tr: "HTTP (rafthttp)", fm: "protobuf raftpb", cr: ["ok", "mTLS"], au: "peer cert, etcd CA",
    what: "Thuật toán Raft giữa các member: leader gửi <b>AppendEntries</b> chứa các entry log (mỗi entry là một lệnh Put/Delete/Txn) và <b>heartbeat</b> (mặc định 100ms); follower trả lời đã ghi tới index nào. Không nghe heartbeat quá election timeout (mặc định 1000ms) thì follower xin bầu (<b>PreVote</b>, <b>Vote</b>). Member tụt quá xa nhận cả <b>snapshot</b>. Một lệnh ghi chỉ được xác nhận khi đa số member đã ghi vào WAL.",
    fmt: "Message raftpb (protobuf) qua HTTP: luồng dài hạn (stream) cho message nhỏ, pipeline cho snapshot.",
    sec: "mTLS bằng <code>etcd/peer.crt</code>, kiểm bằng etcd CA. SAN của peer cert phải có IP mà member khác dùng để gọi.",
    auth: "<code>--peer-client-cert-auth=true</code>, <code>--peer-trusted-ca-file</code>. Member mới phải được thêm bằng <code>member add</code> (kubeadm làm khi join control plane).",
    cfg: "etcd.yaml: <code>--initial-advertise-peer-urls</code>, <code>--listen-peer-urls</code>, <code>--peer-cert-file</code>, <code>--peer-key-file</code>, <code>--initial-cluster</code>.",
    sample: `MsgApp  from=cp-1(leader) to=cp-2  term=7  index=48211  logTerm=7  commit=48210
        entries=[ {term=7 index=48212 data=InternalRaftRequest{Txn put /registry/deployments/default/web …}} ]
MsgAppResp from=cp-2 to=cp-1 term=7 index=48212          # đã ghi WAL tới 48212
MsgHeartbeat from=cp-1 to=cp-3 term=7 commit=48212        # 100ms một lần`,
    see: `etcdctl … member list -w table
etcdctl … endpoint status --cluster -w table   # ai là leader, RAFT TERM, RAFT INDEX từng member`,
    traps: ["Peer cert thiếu IP trong SAN: member mới không vào được cluster.", "Đĩa chậm làm fsync WAL lâu, leader đổi liên tục (<code>leader changed</code> trong log): etcd cần SSD.", "Mất đa số member là mất quyền ghi toàn cluster: 3 member chịu mất 1, 5 chịu mất 2."],
    pk: null, labs: [29, 32]
  },
  {
    id: "ctrl", n: 4, t: "controller-manager, scheduler, kube-proxy → kube-apiserver", p: "TCP 6443", tr: "TLS · HTTP/2 multiplex", fm: "protobuf", cr: ["ok", "mTLS / token"], au: "client cert hoặc SA token",
    what: "Mô hình <b>list + watch</b> (informer): lấy toàn bộ danh sách một lần, rồi giữ một request watch mở để nhận từng sự kiện <code>ADDED</code>, <code>MODIFIED</code>, <code>DELETED</code>, <code>BOOKMARK</code>. Nhiều watch đi chung một kết nối TCP nhờ HTTP/2. Chiều ghi: scheduler <code>POST …/pods/&lt;pod&gt;/binding</code>; controller tạo ReplicaSet, Pod, cập nhật status; leader election bằng cách gia hạn một object <b>Lease</b> trong kube-system.",
    fmt: "Thành phần của Kubernetes gọi bằng protobuf. Luồng watch có <code>content-type: application/vnd.kubernetes.protobuf;stream=watch</code>: mỗi sự kiện là 4 byte độ dài (big-endian) + một <code>WatchEvent</code> {type, object}.",
    sec: "TLS như kết nối 1. apiserver kiểm client bằng <code>--client-ca-file</code>.",
    auth: "controller-manager.conf: CN=<code>system:kube-controller-manager</code>; scheduler.conf: CN=<code>system:kube-scheduler</code>. Với <code>--use-service-account-credentials=true</code> (kubeadm bật), mỗi controller dùng token của ServiceAccount riêng như <code>system:serviceaccount:kube-system:deployment-controller</code>. kube-proxy dùng token của ServiceAccount <code>kube-proxy</code>.",
    cfg: "<code>/etc/kubernetes/controller-manager.conf</code>, <code>/etc/kubernetes/scheduler.conf</code> (kubeconfig có cert nhúng sẵn); kube-proxy: ConfigMap <code>kube-proxy</code> trong kube-system.",
    sample: `# Bắt thật: watch dạng protobuf
GET /api/v1/namespaces/default/pods?watch=1&resourceVersion=48213&allowWatchBookmarks=true
:status 200
content-type: application/vnd.kubernetes.protobuf;stream=watch
00 00 0b 3f | 0a 05 "ADDED" | 12 b5 16 0a b2 16 "k8s\\0" 0a 09 0a 02 "v1" 12 03 "Pod" …
 độ dài=2879   type             object (RawExtension chứa Pod protobuf)

# Cùng luồng ở dạng JSON (kubectl get --raw): mỗi dòng một sự kiện
{"type":"ADDED","object":{"kind":"Pod","apiVersion":"v1","metadata":{"name":"cli","resourceVersion":"628",…}}}

# Scheduler chọn xong node
POST /api/v1/namespaces/default/pods/web-5d4f8c-a/binding
{"kind":"Binding","apiVersion":"v1","metadata":{"name":"web-5d4f8c-a"},"target":{"kind":"Node","name":"node01"}}`,
    see: `kubectl get --raw '/api/v1/namespaces/default/pods?watch=1&timeoutSeconds=5'
kubectl get pods -w -v=6
kubectl -n kube-system get lease kube-scheduler kube-controller-manager   # HOLDER là leader`,
    traps: ["Cert nhúng trong controller-manager.conf và scheduler.conf cũng hết hạn sau 1 năm; <code>kubeadm certs renew all</code> làm mới, nhưng phải khởi động lại static Pod để nạp cert mới.", "Hai controller-manager không có leader election sẽ cùng tạo Pod: luôn có một leader giữ Lease."],
    pk: null, labs: [14, 31]
  },
  {
    id: "kubelet", n: 5, t: "kubelet → kube-apiserver", p: "TCP 6443", tr: "TLS · HTTP/2", fm: "protobuf", cr: ["ok", "mTLS"], au: "cert system:node:<tên>",
    what: "kubelet watch các Pod có <code>spec.nodeName</code> là node của nó; đọc Secret, ConfigMap, PVC mà các Pod đó cần; gửi status Pod; cập nhật <code>Node.status</code> (điều kiện, dung lượng, image) khi có thay đổi hoặc định kỳ; gia hạn <b>Lease</b> <code>kube-node-lease/&lt;node&gt;</code> mỗi 10 giây làm heartbeat; tạo Event; gửi CSR để xin cert mới khi cert sắp hết hạn.",
    fmt: "protobuf, watch giống kết nối 4.",
    sec: "mTLS. Lần đầu (join) kubelet chưa có cert: dùng <b>bootstrap token</b> để gửi CSR (xem tab TLS và danh tính).",
    auth: "Cert <code>/var/lib/kubelet/pki/kubelet-client-current.pem</code>: CN=<code>system:node:node01</code>, O=<code>system:nodes</code>. <b>Node authorizer</b> chỉ cho kubelet đọc Secret/ConfigMap của Pod chạy trên node đó; admission <b>NodeRestriction</b> chỉ cho nó sửa Node và Pod của chính nó.",
    cfg: "<code>/etc/kubernetes/kubelet.conf</code> trỏ tới file cert ở trên; <code>/var/lib/kubelet/config.yaml</code> có <code>rotateCertificates: true</code>.",
    sample: `PUT /apis/coordination.k8s.io/v1/namespaces/kube-node-lease/leases/node01
content-type: application/vnd.kubernetes.protobuf
spec: holderIdentity=node01  leaseDurationSeconds=40  renewTime=2026-11-10T03:22:41.120Z

GET /api/v1/pods?fieldSelector=spec.nodeName%3Dnode01&watch=true&resourceVersion=48213
PATCH /api/v1/namespaces/default/pods/web-5d4f8c-a/status   # Running, IP Pod, điều kiện Ready`,
    see: `kubectl get lease -n kube-node-lease
sudo openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem -noout -subject -enddate
sudo journalctl -u kubelet | grep -i -E 'certificate|x509' | tail`,
    traps: ["Cert client của kubelet hết hạn và không xoay vòng được: node NotReady, log <code>x509: certificate has expired</code>.", "Node không gia hạn Lease quá <code>node-monitor-grace-period</code>: controller đánh NotReady, sau đó gắn taint và Pod bị đuổi."],
    pk: null, labs: [1, 31, 35]
  },
  {
    id: "exec", n: 6, t: "kube-apiserver → kubelet (logs, exec, port-forward)", p: "TCP 10250", tr: "HTTPS · WebSocket/SPDY", fm: "luồng byte theo kênh", cr: ["warn", "TLS, mặc định không kiểm cert kubelet"], au: "apiserver-kubelet-client cert",
    what: "Chiều ngược duy nhất: <code>kubectl logs</code>, <code>exec</code>, <code>attach</code>, <code>port-forward</code> đi kubectl → apiserver → kubelet :10250 → container runtime. Với exec, kubectl nâng cấp kết nối lên <b>WebSocket</b> (subprotocol <code>v5.channel.k8s.io</code>); apiserver chuyển tiếp tới kubelet. Mỗi frame có byte đầu là số kênh: 0 stdin, 1 stdout, 2 stderr, 3 lỗi (Status JSON), 4 đổi kích thước terminal.",
    fmt: "Luồng byte thô của tiến trình, chia kênh như trên. <code>logs</code> là HTTP thường, có <code>follow=true</code> thì giữ kết nối.",
    sec: "TLS. apiserver trình <code>apiserver-kubelet-client.crt</code>. Nhưng chứng chỉ server của kubelet mặc định là <b>tự ký</b> (<code>/var/lib/kubelet/pki/kubelet.crt</code>) và apiserver <b>không kiểm</b> nó trừ khi đặt <code>--kubelet-certificate-authority</code> và bật <code>serverTLSBootstrap: true</code> cho kubelet.",
    auth: "kubelet kiểm cert client bằng <code>authentication.x509.clientCAFile</code>, rồi hỏi apiserver qua <b>SubjectAccessReview</b> (<code>authorization.mode: Webhook</code>): exec/attach/port-forward cần quyền <code>nodes/proxy</code>, logs cần <code>nodes/log</code>. kubeadm tắt truy cập ẩn danh vào kubelet.",
    cfg: "kube-apiserver.yaml: <code>--kubelet-client-certificate</code>, <code>--kubelet-client-key</code>. kubelet: <code>/var/lib/kubelet/config.yaml</code> phần <code>authentication</code> và <code>authorization</code>.",
    sample: `# kubectl exec -v=8 (header bắt thật, rút gọn)
GET /api/v1/namespaces/default/pods/web-66d47686b4-4wzmh/exec?command=cat&command=%2Fetc%2Fhostname&container=nginx&stdout=true&stderr=true
Sec-Websocket-Protocol: v5.channel.k8s.io
← 101 Switching Protocols
  Upgrade: websocket

frame: 01 77 65 62 2d 36 36 … 0a       kênh 1 (stdout): "web-66…\\n"
frame: 03 7b 22 6d 65 74 61 …          kênh 3: {"metadata":{},"status":"Success"}`,
    see: `curl -sk https://node01:10250/pods        # 401 Unauthorized: kubelet không cho ẩn danh
echo | openssl s_client -connect node01:10250 2>/dev/null | openssl x509 -noout -issuer -subject
# issuer=CN = node01-ca@1700000000   → cert tự ký của kubelet
kubectl get csr | grep kubelet-serving    # nếu bật serverTLSBootstrap: phải approve tay`,
    traps: ["<code>kubectl get pods</code> chạy nhưng <code>logs</code>/<code>exec</code> treo: apiserver không tới được node:10250 (firewall, IP node sai).", "<code>Forbidden (user=kube-apiserver-kubelet-client, verb=create, resource=nodes, subresource=proxy)</code>: thiếu RBAC cho user của apiserver trên kubelet.", "metrics-server cần <code>--kubelet-insecure-tls</code> ở cluster lab chính vì cert kubelet tự ký; ở production nên bật serverTLSBootstrap thay vì tắt kiểm."],
    pk: null, labs: [3, 11, 37]
  },
  {
    id: "cri", n: 7, t: "kubelet → containerd (CRI)", p: "unix socket", tr: "gRPC trên socket", fm: "protobuf runtime.v1", cr: ["warn", "cục bộ, không TLS"], au: "quyền file socket (root)",
    what: "CRI có hai service. <b>RuntimeService</b>: <code>RunPodSandbox</code> (tạo container pause và network namespace, gọi CNI), <code>CreateContainer</code>, <code>StartContainer</code>, <code>StopContainer</code>, <code>RemoveContainer</code>, <code>ContainerStatus</code>, <code>ExecSync</code> (probe exec), <code>Exec</code> (trả URL luồng). <b>ImageService</b>: <code>PullImage</code> (kèm thông tin đăng nhập từ imagePullSecrets), <code>ListImages</code>, <code>ImageFsInfo</code>.",
    fmt: "gRPC (HTTP/2 không mã hóa) trên unix socket, message protobuf của gói <code>runtime.v1</code>.",
    sec: "Không TLS, không ra mạng. Bảo vệ duy nhất là quyền của file <code>/run/containerd/containerd.sock</code>: ai ghi được vào socket này là có quyền root trên node.",
    auth: "Không có xác thực ở tầng giao thức; kernel kiểm quyền file khi connect.",
    cfg: "kubelet: <code>containerRuntimeEndpoint: unix:///run/containerd/containerd.sock</code> trong <code>/var/lib/kubelet/config.yaml</code>. crictl: <code>/etc/crictl.yaml</code>.",
    sample: `/runtime.v1.RuntimeService/RunPodSandbox
  config { metadata { name: "web-5d4f8c-a" namespace: "default" uid: "c1847de8-…" }
           hostname: "web-5d4f8c-a"
           log_directory: "/var/log/pods/default_web-5d4f8c-a_c1847de8-…"
           linux { cgroup_parent: "kubepods-burstable-podc1847de8_….slice" } }
  → pod_sandbox_id: "9f2c41…"
/runtime.v1.ImageService/PullImage        image { image: "nginx:1.27" }  auth { … từ imagePullSecrets }
/runtime.v1.RuntimeService/CreateContainer  pod_sandbox_id "9f2c41…"  config { image, command, envs, mounts … }
/runtime.v1.RuntimeService/StartContainer   container_id "e07b3a…"`,
    see: `sudo crictl pods                 # sandbox (Pod) trên node
sudo crictl inspectp <pod-id>    # cấu hình sandbox, IP, netns
sudo crictl ps -a
ls -l /run/containerd/containerd.sock`,
    traps: ["<code>CRI v1 runtime API is not implemented</code>: plugin CRI bị tắt trong <code>/etc/containerd/config.toml</code> (<code>disabled_plugins = [\"cri\"]</code> của gói containerd mặc định).", "Mount <code>containerd.sock</code> vào Pod là trao quyền root của node cho Pod đó."],
    pk: null, labs: [39, 36]
  },
  {
    id: "cni", n: 8, t: "containerd → CNI plugin", p: "không qua mạng", tr: "exec tiến trình", fm: "biến môi trường + JSON", cr: ["warn", "cục bộ"], au: "không có",
    what: "Khi <code>RunPodSandbox</code>, containerd chạy file thực thi trong <code>/opt/cni/bin</code>. Lệnh truyền qua biến môi trường: <code>CNI_COMMAND=ADD|DEL|CHECK</code>, <code>CNI_CONTAINERID</code>, <code>CNI_NETNS</code>, <code>CNI_IFNAME=eth0</code>. Cấu hình mạng (file đầu tiên theo thứ tự tên trong <code>/etc/cni/net.d</code>) đưa vào stdin. Plugin tạo veth, gán IP, route, rồi in kết quả JSON ra stdout.",
    fmt: "JSON trên stdin/stdout.",
    sec: "Không có gì để mã hóa: hai tiến trình trên cùng máy.",
    auth: "Không có.",
    cfg: "<code>/etc/cni/net.d/*.conflist</code> (Calico, Flannel, Cilium tự ghi khi cài), <code>/opt/cni/bin/</code>.",
    sample: `CNI_COMMAND=ADD CNI_CONTAINERID=9f2c41… CNI_NETNS=/var/run/netns/cni-1b6e… CNI_IFNAME=eth0 \\
  /opt/cni/bin/calico  < {"cniVersion":"1.0.0","name":"k8s-pod-network","type":"calico","ipam":{"type":"calico-ipam"},…}

→ {"cniVersion":"1.0.0",
   "interfaces":[{"name":"eth0","sandbox":"/var/run/netns/cni-1b6e…"}],
   "ips":[{"address":"10.244.1.12/32","interface":0}],
   "routes":[{"dst":"0.0.0.0/0"}]}`,
    see: `ls /etc/cni/net.d /opt/cni/bin
sudo ip netns list
kubectl get node node01 -o jsonpath='{.spec.podCIDR}'`,
    traps: ["<code>/etc/cni/net.d</code> trống: node NotReady với <code>network plugin not ready: cni config uninitialized</code>.", "Hai file cấu hình CNI cùng lúc: runtime dùng file đứng đầu theo tên, có thể không phải file bạn nghĩ."],
    pk: null, labs: [40]
  },
  {
    id: "reg", n: 9, t: "containerd → registry", p: "TCP 443", tr: "HTTPS", fm: "OCI Distribution API", cr: ["ok", "TLS + digest"], au: "Bearer token từ imagePullSecret",
    what: "Kéo image theo OCI Distribution: <code>GET /v2/&lt;tên&gt;/manifests/&lt;tag&gt;</code> lấy index đa kiến trúc, chọn manifest đúng <code>linux/amd64</code>, rồi <code>GET /v2/&lt;tên&gt;/blobs/sha256:…</code> cho file config và từng layer (tar nén gzip hoặc zstd). Registry private trả 401 kèm <code>WWW-Authenticate: Bearer realm=…,scope=repository:…:pull</code>; runtime đổi thông tin đăng nhập lấy token rồi gọi lại.",
    fmt: "JSON cho manifest, tar nén cho layer.",
    sec: "TLS khi tải. Thêm nữa, mỗi blob được kiểm bằng <b>sha256 digest</b>: ghim image bằng <code>@sha256:…</code> thì nội dung không thể bị thay.",
    auth: "imagePullSecrets (kiểu <code>kubernetes.io/dockerconfigjson</code>) trong cùng namespace với Pod; kubelet đọc và chuyển vào <code>PullImage</code>.",
    cfg: "<code>/etc/containerd/certs.d/&lt;registry&gt;/hosts.toml</code> cho mirror và CA riêng.",
    sample: `GET /v2/library/nginx/manifests/1.27
Accept: application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json
← 401  WWW-Authenticate: Bearer realm="https://auth.docker.io/token",service="registry.docker.io",scope="repository:library/nginx:pull"
GET /v2/library/nginx/manifests/1.27      Authorization: Bearer eyJ…
← 200  docker-content-digest: sha256:…  (index → manifest linux/amd64)
GET /v2/library/nginx/blobs/sha256:<layer>   → tar.gz, kiểm lại sha256 trước khi giải nén`,
    see: `sudo crictl pull nginx:1.27
kubectl get pod web -o jsonpath='{.status.containerStatuses[0].imageID}'   # digest thật đang chạy`,
    traps: ["ImagePullBackOff với <code>401 Unauthorized</code>: thiếu imagePullSecret, hoặc Secret nằm ở namespace khác Pod.", "Registry nội bộ dùng CA riêng: <code>x509: certificate signed by unknown authority</code> cho tới khi khai báo CA trong certs.d của containerd."],
    pk: null, labs: [33, 39]
  },
  {
    id: "sa", n: 10, t: "Pod → kube-apiserver (trong cluster)", p: "TCP 443 → 6443", tr: "HTTPS", fm: "JSON hoặc protobuf", cr: ["ok", "TLS"], au: "ServiceAccount JWT",
    what: "Ứng dụng trong Pod gọi <code>https://kubernetes.default.svc</code>. DNS trả ClusterIP <code>10.96.0.1:443</code>; kube-proxy DNAT tới <code>&lt;IP control plane&gt;:6443</code> (EndpointSlice <code>kubernetes</code> trong namespace default). Pod đính kèm token ServiceAccount trong header Authorization.",
    fmt: "Thư viện client-go dùng protobuf hoặc JSON; curl dùng JSON.",
    sec: "TLS. Pod kiểm apiserver bằng <code>ca.crt</code> mà kubelet đặt vào <code>/var/run/secrets/kubernetes.io/serviceaccount/</code> (từ ConfigMap <code>kube-root-ca.crt</code>). SAN của apiserver.crt có sẵn <code>kubernetes.default.svc</code> và <code>10.96.0.1</code>.",
    auth: "Token là JWT <b>được ký, không được mã hóa</b>: ai đọc được file token là đọc được nội dung và dùng được nó. apiserver kiểm chữ ký bằng <code>sa.pub</code>, kiểm <code>iss</code>, <code>aud</code>, <code>exp</code> và Pod gắn với token còn tồn tại (đúng uid). User là <code>system:serviceaccount:&lt;ns&gt;:&lt;sa&gt;</code>.",
    cfg: "kube-apiserver.yaml: <code>--service-account-key-file=sa.pub</code>, <code>--service-account-signing-key-file=sa.key</code>, <code>--service-account-issuer</code>. Pod: <code>serviceAccountName</code>, <code>automountServiceAccountToken</code>.",
    sample: `GET /api/v1/namespaces/default/pods
host: kubernetes.default.svc
authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Il9uSkF3b2lf…

# Phần giữa của token (bắt thật, base64url → JSON)
{"aud":["https://kubernetes.default.svc.cluster.local"],
 "exp":1825817290, "iat":1794281290, "nbf":1794281290,
 "iss":"https://kubernetes.default.svc.cluster.local",
 "kubernetes.io":{"namespace":"default",
   "node":{"name":"node02","uid":"be9038b6-…"},
   "pod":{"name":"web-66d47686b4-4wzmh","uid":"c1847de8-…"},
   "serviceaccount":{"name":"default","uid":"d84e82e1-…"},
   "warnafter":1794284897},
 "sub":"system:serviceaccount:default:default"}`,
    see: `# trong Pod
D=/var/run/secrets/kubernetes.io/serviceaccount
curl --cacert $D/ca.crt -H "Authorization: Bearer $(cat $D/token)" \\
  https://kubernetes.default.svc/api/v1/namespaces/default/pods
cut -d. -f2 $D/token | tr '_-' '/+' | base64 -d 2>/dev/null; echo     # đọc nội dung token
# ngoài cluster
kubectl create token web --duration=10m
kubectl auth can-i list pods --as=system:serviceaccount:default:web`,
    traps: ["403 <code>system:serviceaccount:default:default cannot list resource \"pods\"</code>: token hợp lệ, thiếu Role/RoleBinding.", "kubelet xin token thời hạn khoảng 1 giờ; apiserver mặc định nới thành 1 năm cho tương thích (thấy ở exp − iat), <code>warnafter</code> đánh dấu mốc 1 giờ. kubelet vẫn tự làm mới file token.", "Không cần gọi API thì đặt <code>automountServiceAccountToken: false</code>: không có token thì không có gì để lộ."],
    pk: null, labs: [23, 25]
  },
  {
    id: "dns", n: 11, t: "Pod → CoreDNS", p: "UDP/TCP 53", tr: "DNS", fm: "DNS nhị phân", cr: ["bad", "không mã hóa"], au: "không có",
    what: "Pod hỏi <code>nameserver 10.96.0.10</code> (Service kube-dns) trong <code>/etc/resolv.conf</code>. Kèm <code>search default.svc.cluster.local svc.cluster.local cluster.local</code> và <code>options ndots:5</code>: tên có ít hơn 5 dấu chấm được thử ghép từng search domain trước. CoreDNS trả lời từ Service và EndpointSlice nó watch qua apiserver.",
    fmt: "Gói DNS chuẩn (header, question, answer). Trả lời lớn hơn 512 byte thì chuyển sang TCP.",
    sec: "Không mã hóa, giống DNS truyền thống.",
    auth: "Không có. NetworkPolicy default-deny phải mở egress UDP và TCP 53 tới kube-dns, nếu không mọi lookup đều hỏng.",
    cfg: "ConfigMap <code>coredns</code> (Corefile) trong kube-system; <code>clusterDNS</code> và <code>clusterDomain</code> trong cấu hình kubelet.",
    sample: `10.244.1.12:53211 → 10.96.0.10:53  (DNAT tới Pod CoreDNS 10.244.0.5:53)
Query  id=0x3c1a  RD=1  A? web.default.svc.cluster.local.
Answer id=0x3c1a  AA=1  web.default.svc.cluster.local.  5  IN  A  10.96.120.15
# Service headless: trả về IP từng Pod thay cho ClusterIP. TTL 5 giây là mặc định của plugin kubernetes.`,
    see: `kubectl run t --rm -it --image=busybox:1.36 --restart=Never -- nslookup web.default
kubectl exec web -- cat /etc/resolv.conf
sudo tcpdump -ni any udp port 53 -c 10     # trên node`,
    traps: ["Gọi tên ngoài như <code>api.github.com</code> sinh nhiều query thừa do ndots:5; thêm dấu chấm cuối (<code>api.github.com.</code>) hoặc hạ ndots.", "Quên mở cổng 53 trong NetworkPolicy egress: mọi thứ báo <code>bad address</code> dù IP vẫn gọi được."],
    pk: "dns", labs: [16, 17]
  },
  {
    id: "pod", n: 12, t: "Pod ↔ Pod (khác node)", p: "tùy CNI", tr: "route hoặc VXLAN, IPIP, Geneve", fm: "gói IP của ứng dụng", cr: ["bad", "không mã hóa (mặc định)"], au: "không có",
    what: "Gói IP thật của ứng dụng, nguồn là IP Pod A, đích là IP Pod B, không NAT. Cùng node: đi qua veth và route (hoặc bridge) của node. Khác node: <b>định tuyến</b> (Calico BGP: các node trao đổi route qua TCP 179, gói đi nguyên) hoặc <b>đóng gói</b>: VXLAN (UDP 4789 ở Calico, 8472 ở Flannel và Cilium), IPIP (IP protocol 4), Geneve (UDP 6081).",
    fmt: "Nguyên gói của ứng dụng, thêm header đóng gói nếu là overlay. VXLAN thêm 50 byte nên MTU của Pod thường là 1450; IPIP thêm 20 byte (1480).",
    sec: "<b>Không mã hóa</b>. Ai bắt gói trên mạng giữa các node thấy nguyên request, kể cả header Authorization. Muốn mã hóa: WireGuard của CNI (Calico <code>wireguardEnabled</code>, Cilium <code>encryption.type=wireguard</code> hoặc IPsec), hoặc mTLS ở tầng ứng dụng bằng service mesh (Istio, Linkerd) hay chính ứng dụng.",
    auth: "Không có. NetworkPolicy lọc theo IP/label nhưng không mã hóa và không xác thực danh tính. Service mesh mTLS cho mỗi workload một danh tính (SPIFFE ID) và chính sách theo danh tính đó.",
    cfg: "Calico: Installation CR (<code>encapsulation: VXLAN | IPIP | None</code>), FelixConfiguration. Flannel: ConfigMap <code>kube-flannel-cfg</code> (backend vxlan). Cilium: Helm values <code>routingMode</code>, <code>tunnelProtocol</code>.",
    sample: `# Bắt thật trên dây giữa node01 và node02 (k3s, Flannel VXLAN)
outer  172.18.0.3 → 172.18.0.4  UDP 36361 → 8472   VXLAN VNI 1
inner  10.42.1.3:44668 → 10.42.3.2:80   TCP PSH,ACK
GET /api/orders?id=42 HTTP/1.1
Host: 10.42.3.2
User-Agent: Wget
Authorization: Bearer demo-token-123        ← đọc được nguyên văn`,
    see: `sudo tcpdump -ni eth0 -A udp port 4789     # Calico VXLAN (Flannel: 8472)
sudo tcpdump -ni eth0 ip proto 4            # Calico IPIP
ip -d link show vxlan.calico                # VNI, cổng, MTU
kubectl get felixconfiguration default -o yaml | grep -i wireguard`,
    traps: ["Firewall giữa các node chặn UDP 4789/8472 hoặc protocol 4: Pod cùng node gọi được nhau, khác node thì không.", "MTU không khớp: request nhỏ chạy, response lớn treo.", "Cloud bật kiểm tra source/destination: chế độ định tuyến không đóng gói bị chặn."],
    pk: "vxlan", labs: [15, 17, 40]
  },
  {
    id: "svc", n: 13, t: "Pod → Service ClusterIP (kube-proxy)", p: "cổng của Service", tr: "DNAT trong kernel", fm: "gói không đổi nội dung", cr: ["bad", "không mã hóa"], au: "không có",
    what: "kube-proxy <b>không nằm trên đường đi của gói</b>. Nó watch Service và EndpointSlice rồi ghi rule iptables, nftables hoặc IPVS. Gói tới <code>10.96.120.15:80</code> bị DNAT ngay trên node nguồn thành <code>10.244.2.7:8080</code> (một endpoint chọn ngẫu nhiên); conntrack ghi nhớ để gói trả lời được đổi ngược. ClusterIP không bao giờ đi ra khỏi node.",
    fmt: "Chỉ đổi IP và cổng đích trong header; payload giữ nguyên.",
    sec: "Không mã hóa. Service chỉ là cân bằng tải L4.",
    auth: "Không có.",
    cfg: "ConfigMap <code>kube-proxy</code>: <code>mode: iptables | nftables | ipvs</code>; dải ClusterIP từ <code>--service-cluster-ip-range</code> của apiserver.",
    sample: `Rời Pod:      10.244.1.12:40312 → 10.96.120.15:80     (ClusterIP của Service web)
Sau DNAT:     10.244.1.12:40312 → 10.244.2.7:8080     (Pod web-5d4f8c-b, targetPort 8080)
conntrack:    tcp ESTABLISHED src=10.244.1.12 dst=10.96.120.15 dport=80 → src=10.244.2.7 sport=8080`,
    see: `sudo iptables -t nat -L KUBE-SERVICES -n | grep 10.96.120.15
sudo nft list table ip kube-proxy | grep 10.96.120.15      # chế độ nftables
sudo conntrack -L -d 10.96.120.15
kubectl get endpointslices -l kubernetes.io/service-name=web`,
    traps: ["Selector của Service không khớp label Pod: không có endpoint, kết nối bị từ chối ngay.", "Sai <code>targetPort</code>: DNAT tới đúng Pod nhưng sai cổng."],
    pk: "svc", labs: [15, 34]
  },
  {
    id: "hook", n: 14, t: "kube-apiserver → admission webhook, aggregated API", p: "TCP 443 (Service)", tr: "HTTPS", fm: "JSON AdmissionReview", cr: ["ok", "TLS + caBundle"], au: "caBundle; front-proxy cert",
    what: "<b>Admission webhook</b>: trước khi lưu object, apiserver POST một <code>AdmissionReview</code> tới Service của webhook (ví dụ cert-manager, Kyverno), nhận lại <code>allowed</code> và có thể một JSONPatch. <b>Aggregated API</b> (ví dụ <code>metrics.k8s.io</code> của metrics-server): apiserver chuyển nguyên request tới server mở rộng, kèm danh tính người gọi trong header.",
    fmt: "JSON. Patch trả về là JSONPatch mã hóa base64.",
    sec: "TLS. apiserver kiểm cert của webhook bằng <code>caBundle</code> trong <code>MutatingWebhookConfiguration</code>, <code>ValidatingWebhookConfiguration</code> hoặc <code>APIService</code> (cert-manager có thể tự điền).",
    auth: "Webhook thường tin mọi request có TLS hợp lệ. Aggregated API: apiserver trình <code>front-proxy-client.crt</code> và gửi <code>X-Remote-User</code>, <code>X-Remote-Group</code>; server mở rộng tin các header này vì cert do <code>front-proxy-ca</code> ký (ConfigMap <code>extension-apiserver-authentication</code>).",
    cfg: "Webhook: <code>clientConfig.service</code>, <code>caBundle</code>, <code>failurePolicy</code>, <code>timeoutSeconds</code> (mặc định 10). apiserver: <code>--requestheader-client-ca-file</code>, <code>--proxy-client-cert-file</code>.",
    sample: `POST https://cert-manager-webhook.cert-manager.svc:443/validate?timeout=10s
{"apiVersion":"admission.k8s.io/v1","kind":"AdmissionReview",
 "request":{"uid":"705ab4f5-6393-11e8-b7cc-42010a800002",
   "kind":{"group":"cert-manager.io","version":"v1","kind":"Certificate"},
   "operation":"CREATE",
   "userInfo":{"username":"kubernetes-admin","groups":["kubeadm:cluster-admins","system:authenticated"]},
   "object":{…}}}
← {"apiVersion":"admission.k8s.io/v1","kind":"AdmissionReview",
   "response":{"uid":"705ab4f5-6393-11e8-b7cc-42010a800002","allowed":true}}`,
    see: `kubectl get validatingwebhookconfigurations,mutatingwebhookconfigurations
kubectl get apiservice v1beta1.metrics.k8s.io      # AVAILABLE phải là True
kubectl -n kube-system get cm extension-apiserver-authentication -o yaml | head`,
    traps: ["Webhook chết và <code>failurePolicy: Fail</code>: mọi lệnh tạo object nó bắt đều lỗi <code>failed calling webhook … context deadline exceeded</code>.", "<code>kubectl top</code> báo <code>Metrics API not available</code>: APIService của metrics-server không Available (Pod chưa chạy, cert, mạng)."],
    pk: null, labs: [11, 28, 42]
  },
  {
    id: "edge", n: 15, t: "Client Internet → Gateway/Ingress → Pod", p: "TCP 443 → Pod", tr: "HTTPS rồi HTTP", fm: "HTTP của ứng dụng", cr: ["warn", "TLS tới Gateway, sau đó tùy cấu hình"], au: "của ứng dụng",
    what: "Load balancer chuyển TCP 443 tới Pod của Gateway (hoặc ingress controller). Gateway <b>kết thúc TLS</b> bằng Secret <code>kubernetes.io/tls</code>, chọn chứng chỉ theo SNI, đọc host và path để chọn route, rồi mở kết nối mới tới IP Pod backend (thường gọi thẳng endpoint, không qua ClusterIP).",
    fmt: "HTTP/1.1, HTTP/2 hoặc gRPC; Gateway thêm <code>X-Forwarded-For</code>, <code>X-Forwarded-Proto</code>.",
    sec: "Từ Internet tới Gateway: TLS. Từ Gateway tới Pod: <b>HTTP thường</b>, trừ khi cấu hình TLS tới backend (Gateway API <code>BackendTLSPolicy</code>), passthrough (<code>TLSRoute</code>, TLS kết thúc ở Pod), hoặc service mesh.",
    auth: "Do ứng dụng (cookie, OAuth, JWT). Chứng chỉ client (mTLS từ client) cấu hình được ở listener nếu cần.",
    cfg: "Gateway listener <code>protocol: HTTPS</code>, <code>tls.certificateRefs</code>; Ingress <code>spec.tls</code>.",
    sample: `Internet → LB → gateway-pod:443   TLS SNI=shop.example.com  (cert từ Secret shop-tls)
gateway-pod → 10.244.2.7:8080      GET /api/orders HTTP/1.1
                                   Host: shop.example.com
                                   X-Forwarded-For: 203.0.113.9
                                   X-Forwarded-Proto: https`,
    see: `kubectl get gateway,httproute -A
openssl s_client -connect shop.example.com:443 -servername shop.example.com </dev/null | openssl x509 -noout -subject -dates`,
    traps: ["Secret TLS ở namespace khác Gateway mà không có ReferenceGrant: listener báo <code>RefNotPermitted</code>.", "Ứng dụng tưởng mọi thứ là HTTPS vì người dùng thấy ổ khóa, trong khi đoạn Gateway → Pod là HTTP."],
    pk: null, labs: [18, 19, 44]
  }
];

/* ---------- mổ gói tin ---------- */
/* layer: [nhóm, tên, số byte, các trường, giải thích, đã mã hóa trên dây?] */
const WIRE_PKTS = [
  {
    id: "kubectl", from: "kubectl", to: "kube-apiserver", t: "kubectl → apiserver", sub: "kubectl create deploy web, đi qua mạng tới 10.0.0.10:6443",
    see: "IP hai đầu, cổng 6443, SNI lúc bắt tay, kích thước và nhịp gói.", hide: "Verb, đường dẫn API, object, danh tính client (TLS 1.3 mã hóa cả chứng chỉ).",
    layers: [
      ["l2", "Ethernet", 14, "dst 52:54:00:1a:2b:3c (gateway) · src 3c:22:fb:7e:01:9a · type 0x0800", "Chỉ có nghĩa trong một chặng mạng; mỗi router ghi lại.", false],
      ["l3", "IPv4", 20, "192.168.1.20 → 10.0.0.10 · proto 6 TCP · TTL 64", "TLS không che địa chỉ: ai nói chuyện với ai luôn lộ.", false],
      ["l4", "TCP", 32, "51544 → 6443 · PSH,ACK · seq 2231907145", "Cổng 6443 đủ để đoán đây là Kubernetes API.", false],
      ["tls", "TLS record", 5, "type 23 application_data · 0x0303 · length 1187", "Đầu record luôn ở dạng rõ, chỉ cho biết độ dài. Lúc bắt tay, ClientHello mang SNI (tên server trong kubeconfig, ví dụ lb.lab) ở dạng rõ.", false],
      ["app", "HTTP/2 HEADERS", 96, ":method POST\n:path /apis/apps/v1/namespaces/default/deployments?fieldManager=kubectl-create&fieldValidation=Strict\ncontent-type application/vnd.kubernetes.protobuf\nuser-agent kubectl/v1.37.0", "Header nén HPACK. Không có authorization: admin dùng client certificate, danh tính đã xác lập lúc bắt tay.", true],
      ["app", "HTTP/2 DATA", 420, "6b 38 73 00  → k8s\\0 (magic protobuf của Kubernetes)\n0a 15 0a 07 apps/v1 12 0a Deployment\n12 c8 0e … metadata, spec (replicas, selector, template, image nginx:1.27)", "Chính là object apiserver sẽ kiểm tra rồi lưu vào etcd.", true],
      ["tls", "AEAD tag", 16, "16 byte xác thực (AES-128-GCM)", "Sửa một bit trên đường đi là bên nhận phát hiện và cắt kết nối: TLS chống cả nghe lén lẫn sửa gói.", false]
    ]
  },
  {
    id: "etcd", from: "kube-apiserver", to: "etcd", t: "apiserver → etcd: ghi Secret", sub: "kubectl create secret generic db --from-literal=password='S3cr3t!' — etcd riêng ở 10.0.0.21",
    variants: ["Chưa mã hóa lúc lưu", "Có EncryptionConfiguration (aescbc)"],
    see: "IP, cổng 2379, kích thước.", hide: "Key, value (nhờ mTLS). Nhưng trên đĩa etcd thì xem dòng value.",
    layers: v => [
      ["l2", "Ethernet", 14, "cp-1 → etcd-1 · type 0x0800", "etcd stacked (cùng node) đi qua 127.0.0.1, không ra dây; etcd riêng thì đi qua mạng như ở đây.", false],
      ["l3", "IPv4", 20, "10.0.0.10 → 10.0.0.21 · TCP", "", false],
      ["l4", "TCP", 32, "43120 → 2379", "", false],
      ["tls", "TLS record", 5, "application_data · length 344", "mTLS: apiserver trình apiserver-etcd-client.crt, etcd kiểm bằng etcd/ca.crt.", false],
      ["app", "HTTP/2 HEADERS (gRPC)", 48, ":method POST\n:path /etcdserverpb.KV/Txn\ncontent-type application/grpc", "", true],
      ["app", "gRPC frame", 5, "00 | 00 00 01 12  → không nén, dài 274 byte", "", true],
      ["app", "TxnRequest", 44, "compare mod_revision(/registry/secrets/default/db) == 0\nsuccess put key=/registry/secrets/default/db", "Ghi có điều kiện: revision khác nghĩa là có người vừa sửa, Txn thất bại và client nhận 409 Conflict. Key luôn ở dạng rõ trong etcd: tên Secret lộ dù bật mã hóa.", true],
      v === 0
        ? ["rest", "value (cũng là thứ nằm trên đĩa etcd)", 230, "6b 38 73 00 0a 0c 0a 02 76 31 12 06 53 65 63 72 65 74   k8s\\0 · v1 · Secret\n12 cd 01 … metadata: db, default, uid, managedFields (kubectl-create)\n12 13 0a 08 70 61 73 73 77 6f 72 64 12 07 53 33 63 72 33 74 21\n         p  a  s  s  w  o  r  d        S  3  c  r  3  t  !\n1a 06 4f 70 61 71 75 65   Opaque", "Bắt thật trên cluster lab. Mật khẩu nằm nguyên văn: base64 chỉ là cách JSON hiển thị bytes, protobuf lưu bytes thô. Ai đọc được đĩa etcd hoặc file snapshot là đọc được Secret.", true, false]
        : ["rest", "value (cũng là thứ nằm trên đĩa etcd)", 230, "6b 38 73 3a 65 6e 63 3a 61 65 73 63 62 63 3a 76 31 3a 6b 65 79 31 3a\nk  8  s  :  e  n  c  :  a  e  s  c  b  c  :  v  1  :  k  e  y  1  :\n9c 41 e0 7d 2b … 16 byte IV + ciphertext AES-CBC (không còn chữ nào đọc được)", "apiserver mã hóa trước khi gửi. etcd, snapshot và người đọc được đĩa chỉ thấy tên provider và tên khóa. Khóa nằm trong file EncryptionConfiguration trên control plane: lộ file đó là lộ hết.", true, true],
      ["tls", "AEAD tag", 16, "16 byte", "", false]
    ]
  },
  {
    id: "vxlan", from: "Pod cli (node01)", to: "Pod web (node02)", t: "Pod → Pod khác node (VXLAN)", sub: "Bắt thật trên cluster lab: Pod cli ở node01 gọi Pod web ở node02, CNI Flannel",
    see: "Mọi thứ: IP node, IP Pod, URL, header, token, body.", hide: "Không có gì.",
    layers: [
      ["l2", "Ethernet ngoài", 14, "dst 12:0f:5a:67:2a:19 (node02) · src 42:64:5d:26:14:ed (node01)", "", false],
      ["l3", "IPv4 ngoài", 20, "172.18.0.3 (node01) → 172.18.0.4 (node02) · proto 17 UDP · TTL 64", "Mạng thật giữa các node (underlay) chỉ biết IP node.", false],
      ["l4", "UDP ngoài", 8, "36361 → 8472 · length 208", "Flannel và Cilium dùng 8472 (mặc định của kernel Linux); Calico và chuẩn IANA dùng 4789. Cổng nguồn băm từ gói bên trong để chia tải.", false],
      ["tun", "VXLAN", 8, "flags 0x08 (có VNI) · VNI 1", "Calico mặc định VNI 4096. Tổng 50 byte bọc ngoài là lý do MTU của Pod là 1450 trên mạng 1500.", false],
      ["l2", "Ethernet trong", 14, "dst 62:f5:49:14:cc:99 (flannel.1 node02) · src b2:97:38:c7:69:b9 (flannel.1 node01)", "", false],
      ["l3", "IPv4 trong", 20, "10.42.1.3 (Pod cli) → 10.42.3.2 (Pod web) · TCP · TTL 63", "IP thật của Pod, không NAT. TTL giảm 1 vì node nguồn đã định tuyến gói.", false],
      ["l4", "TCP trong", 32, "44668 → 80 · PSH,ACK", "", false],
      ["app", "HTTP", 120, "GET /api/orders?id=42 HTTP/1.1\nHost: 10.42.3.2\nUser-Agent: Wget\nAuthorization: Bearer demo-token-123", "Token đọc được nguyên văn bằng tcpdump trên mạng giữa các node. Mạng Pod mặc định không mã hóa.", false]
    ]
  },
  {
    id: "wg", from: "Pod cli (node01)", to: "Pod web (node02)", t: "Pod → Pod khác node (WireGuard)", sub: "Cùng request như trên nếu bật WireGuard của CNI (Calico: wireguardEnabled: true)",
    see: "IP hai node, cổng WireGuard, kích thước gói.", hide: "IP Pod, cổng, URL, header, token, body.",
    layers: [
      ["l2", "Ethernet", 14, "node01 → node02", "", false],
      ["l3", "IPv4 ngoài", 20, "172.18.0.3 (node01) → 172.18.0.4 (node02) · proto 17 UDP", "", false],
      ["l4", "UDP", 8, "51820 → 51820", "Calico dùng UDP 51820, Cilium 51871. Phải mở cổng này giữa các node.", false],
      ["tun", "WireGuard", 16, "type 4 (transport data) · receiver index 0x5f1c2a07 · counter 18342", "Counter chống phát lại gói cũ. Khóa phiên sinh từ handshake Noise (Curve25519) với khóa công khai mỗi node mà CNI phân phối, đổi mới khoảng 2 phút một lần.", false],
      ["l3", "IPv4 trong", 20, "10.42.1.3 → 10.42.3.2 · TCP", "", true],
      ["l4", "TCP", 32, "44668 → 80", "", true],
      ["app", "HTTP", 120, "GET /api/orders?id=42 HTTP/1.1\nAuthorization: Bearer demo-token-123", "Mã hóa bằng ChaCha20-Poly1305.", true],
      ["tls", "Poly1305 tag", 16, "16 byte xác thực", "Tổng phần bọc thêm khoảng 60 byte với IPv4: MTU của Pod hạ xuống 1440.", false]
    ]
  },
  {
    id: "svc", from: "Pod (node01)", to: "Pod web", t: "Pod → Service ClusterIP", sub: "curl http://web (ClusterIP 10.96.120.15:80) — kube-proxy đã cài rule DNAT trên node nguồn",
    variants: ["Lúc rời Pod", "Sau DNAT trên node nguồn"],
    see: "Mọi thứ (không mã hóa).", hide: "Không có gì. ClusterIP chỉ tồn tại trong node nguồn.",
    layers: v => [
      ["l2", "Ethernet", 14, v === 0 ? "eth0 của Pod → veth trên node" : "node01 → node02 (hoặc bọc VXLAN như ví dụ trước)", "", false],
      ["l3", "IPv4", 20, v === 0 ? "10.244.1.12 → 10.96.120.15 (ClusterIP của web)" : "10.244.1.12 → 10.244.2.7 (Pod web-5d4f8c-b, kube-proxy chọn ngẫu nhiên)", v === 0 ? "ClusterIP không gắn vào card mạng nào; chỉ có rule NAT biết nó." : "conntrack nhớ cặp này để gói trả lời được đổi nguồn về 10.96.120.15.", false],
      ["l4", "TCP", 32, v === 0 ? "40312 → 80 (port của Service)" : "40312 → 8080 (targetPort)", "", false],
      ["app", "HTTP", 80, "GET / HTTP/1.1\nHost: web", "Payload không đổi: Service là cân bằng tải L4, không đọc HTTP.", false]
    ]
  },
  {
    id: "dns", from: "Pod (node01)", to: "CoreDNS", t: "Pod → CoreDNS", sub: "nslookup web.default từ Pod ở node01",
    see: "Mọi thứ: tên đang hỏi và câu trả lời.", hide: "Không có gì.",
    layers: [
      ["l3", "IPv4", 20, "10.244.1.12 → 10.96.0.10 (kube-dns) → DNAT tới 10.244.0.5 (Pod CoreDNS)", "", false],
      ["l4", "UDP", 8, "53211 → 53", "Trả lời lớn hơn 512 byte chuyển sang TCP 53.", false],
      ["app", "DNS query", 47, "id 0x3c1a · RD=1 · A? web.default.default.svc.cluster.local.  → NXDOMAIN\nid 0x3c1b · A? web.default.svc.cluster.local.", "ndots:5 làm resolver ghép search domain trước: lần đầu thử web.default.default.svc.cluster.local.", false],
      ["app", "DNS answer", 63, "web.default.svc.cluster.local.  5  IN  A  10.96.120.15", "TTL 5 giây là mặc định của plugin kubernetes trong CoreDNS.", false]
    ]
  }
];

const WIRE_IDS = [
  ["Client certificate (x509)", "Trong bắt tay TLS (message Certificate)", "Chữ ký do CA trong <code>--client-ca-file</code>, còn hạn", "user = CN, groups = O. Ví dụ <code>kubernetes-admin</code> / <code>kubeadm:cluster-admins</code>"],
  ["ServiceAccount token (JWT)", "Header <code>Authorization: Bearer</code>", "Chữ ký bằng <code>sa.pub</code>, <code>iss</code>, <code>aud</code>, <code>exp</code>, Pod gắn token còn tồn tại", "<code>system:serviceaccount:default:web</code>, groups <code>system:serviceaccounts</code>, <code>system:serviceaccounts:default</code>"],
  ["Bootstrap token", "<code>Authorization: Bearer abcdef.0123456789abcdef</code>", "Secret <code>bootstrap-token-abcdef</code> trong kube-system, chưa hết hạn", "<code>system:bootstrap:abcdef</code>, group <code>system:bootstrappers:kubeadm:default-node-token</code>"],
  ["OIDC", "<code>Authorization: Bearer &lt;id_token&gt;</code>", "Chữ ký theo JWKS của nhà cung cấp danh tính (<code>--oidc-issuer-url</code> hoặc AuthenticationConfiguration)", "Claim email hoặc sub, claim groups"],
  ["Front proxy", "Cert <code>front-proxy-client</code> + header <code>X-Remote-User</code>, <code>X-Remote-Group</code>", "Cert do <code>--requestheader-client-ca-file</code> ký", "Danh tính gốc của người gọi, chuyển tiếp tới aggregated API"],
  ["Ẩn danh", "Không có gì", "<code>--anonymous-auth</code> (kubeadm để bật nhưng RBAC gần như không cho gì)", "<code>system:anonymous</code>, group <code>system:unauthenticated</code>"]
];

const WIRE_PKI = [
  ["ca.crt / ca.key", "tự ký", "CN=kubernetes", "CA của cluster: ký apiserver.crt, cert kubelet, cert user, kubeconfig của thành phần", "10 năm"],
  ["apiserver.crt", "ca", "CN=kube-apiserver · SAN: kubernetes, kubernetes.default, kubernetes.default.svc, kubernetes.default.svc.cluster.local, 10.96.0.1, IP node, control-plane-endpoint", "Server cert của :6443", "1 năm"],
  ["apiserver-kubelet-client.crt", "ca", "CN=kube-apiserver-kubelet-client", "apiserver gọi kubelet :10250 (logs, exec)", "1 năm"],
  ["apiserver-etcd-client.crt", "etcd/ca", "CN=kube-apiserver-etcd-client", "apiserver → etcd :2379", "1 năm"],
  ["etcd/ca.crt / ca.key", "tự ký", "CN=etcd-ca", "CA riêng của etcd", "10 năm"],
  ["etcd/server.crt", "etcd/ca", "CN=<node> · SAN: localhost, 127.0.0.1, IP node", "etcd lắng nghe :2379", "1 năm"],
  ["etcd/peer.crt", "etcd/ca", "CN=<node> · SAN: IP node", "etcd ↔ etcd :2380", "1 năm"],
  ["etcd/healthcheck-client.crt", "etcd/ca", "CN=kube-etcd-healthcheck-client", "Probe của Pod etcd", "1 năm"],
  ["front-proxy-ca.crt", "tự ký", "CN=front-proxy-ca", "CA cho aggregation layer", "10 năm"],
  ["front-proxy-client.crt", "front-proxy-ca", "CN=front-proxy-client", "apiserver → metrics-server và aggregated API khác", "1 năm"],
  ["sa.key / sa.pub", "cặp khóa, không phải cert", "—", "Ký và kiểm ServiceAccount token", "không hết hạn"],
  ["admin.conf", "ca", "CN=kubernetes-admin · O=kubeadm:cluster-admins", "kubectl của admin; group được ClusterRoleBinding tới cluster-admin", "1 năm"],
  ["super-admin.conf", "ca", "CN=kubernetes-super-admin · O=system:masters", "Dùng khi khẩn cấp: system:masters bỏ qua RBAC. Chỉ có trên node chạy init", "1 năm"],
  ["controller-manager.conf", "ca", "CN=system:kube-controller-manager", "controller-manager → apiserver", "1 năm"],
  ["scheduler.conf", "ca", "CN=system:kube-scheduler", "scheduler → apiserver", "1 năm"],
  ["kubelet.conf → /var/lib/kubelet/pki/kubelet-client-current.pem", "ca (qua CSR)", "CN=system:node:<node> · O=system:nodes", "kubelet → apiserver, tự xoay vòng", "1 năm"],
  ["/var/lib/kubelet/pki/kubelet.crt", "kubelet tự ký", "CN=<node>@… · issuer <node>-ca@…", "Server cert của kubelet :10250 (mặc định không ai kiểm)", "1 năm"]
];

const WIRE_JOURNEY = [
  ["1", "kubectl → apiserver", "protobuf (hoặc JSON, khi đó data hiện dạng base64)", "TLS", "ok"],
  ["2", "Trong bộ nhớ apiserver", "bytes thô", "—", ""],
  ["3", "apiserver → etcd", "protobuf, bytes thô; hoặc ciphertext nếu bật EncryptionConfiguration", "mTLS", "ok"],
  ["4", "Đĩa etcd, file snapshot, bản sao lưu", "giống bước 3", "Chỉ khi bật EncryptionConfiguration hoặc mã hóa ổ đĩa", "bad"],
  ["5", "apiserver → kubelet (watch Secret)", "protobuf, bytes thô", "mTLS; Node authorizer chỉ đưa Secret của Pod trên node đó", "ok"],
  ["6", "Trên node", "Volume Secret là tmpfs (RAM, không ghi đĩa); biến môi trường nằm trong /proc/<pid>/environ", "Quyền file", "warn"],
  ["7", "Trong container", "File thường hoặc biến môi trường", "Không: ai exec được vào container là đọc được", "bad"]
];

const WIRE_PROVIDERS = [
  ["identity", "Không mã hóa (mặc định)", "Đặt cuối danh sách để vẫn đọc được dữ liệu cũ chưa mã hóa"],
  ["aescbc", "AES-CBC, padding PKCS#7", "Hay gặp trong bài thi; tài liệu Kubernetes không khuyên dùng vì CBC dễ bị tấn công padding oracle"],
  ["aesgcm", "AES-GCM", "Nhanh nhưng phải xoay khóa trước khoảng 200.000 lần ghi với cùng khóa"],
  ["secretbox", "XSalsa20 + Poly1305", "Nhanh, khóa 32 byte"],
  ["kms v2", "Envelope encryption: khóa dữ liệu (DEK) mã hóa object, khóa chính (KEK) nằm trong KMS bên ngoài", "Khuyên dùng cho production: khóa chính không nằm trên đĩa control plane"]
];

const WIRE_TABS = [["map", "Bản đồ kết nối"], ["pkt", "Mổ một gói tin"], ["tls", "TLS và danh tính"], ["pki", "Chứng chỉ kubeadm"], ["rest", "Mã hóa lúc lưu"], ["err", "Sự cố & khắc phục"], ["obs", "Quan sát (observability)"], ["cheat", "Bảng tra nhanh"]];
let wireCur = "map", wireConn = "kubectl", wirePkt = "kubectl", wireVar = 0, wireEye = 0;

const wCode = (t, cls) => '<div class="codewrap"><pre class="code' + (cls ? " " + cls : "") + '">' + kEsc(t) + "</pre></div>";
const wLabs = ls => ls.map(n => '<a class="pill cp" style="text-decoration:none" href="index.html#lab-' + String(n).padStart(2, "0") + '">Lab ' + String(n).padStart(2, "0") + "</a>").join(" ");
const W_CIRC = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮";
const W_LOCK = '<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" style="vertical-align:-1px"><path fill="currentColor" d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Z"/></svg>';
const W_GROUP = { l2: "Tầng 2", l3: "Tầng 3", l4: "Tầng 4", tun: "Đóng gói", tls: "TLS / mã hóa", app: "Ứng dụng", rest: "Dữ liệu lưu" };

function wireInit() {
  const t = $("#wireTabs");
  if (!t.dataset.ready) {
    t.dataset.ready = "1";
    t.innerHTML = WIRE_TABS.map(x => '<button type="button" data-w="' + x[0] + '" aria-pressed="false">' + kEsc(x[1]) + "</button>").join("");
    t.addEventListener("click", e => { const b = e.target.closest("button[data-w]"); if (b) { wireCur = b.dataset.w; store.set("wire", wireCur); wireShow(); } });
    $("#wireBody").addEventListener("click", e => {
      const c = e.target.closest("[data-conn]"); if (c) {
        const jump = wireCur !== "map" || innerWidth < 920; wireConn = c.dataset.conn; store.set("wireConn", wireConn);
        if (wireCur === "map" && $("#wireDetail")) { if (wmTourOn) wmTour(); wireMapDetail(); wmLoop(wireConn); } else { wireCur = "map"; store.set("wire", "map"); wireShow(); }
        if (jump) $("#wireDetail").scrollIntoView({ block: "start" }); return;
      }
      const p = e.target.closest("[data-pk]"); if (p) { wirePkt = p.dataset.pk; wireVar = 0; wireCur = "pkt"; store.set("wire", "pkt"); wireShow(); return; }
      const v = e.target.closest("[data-var]"); if (v) { wireVar = +v.dataset.var; wireShow(); return; }
      const y = e.target.closest("[data-eye]"); if (y) { wireEye = +y.dataset.eye; wireShow(); return; }
      if (e.target.closest("#wmTour")) { wmTour(); return; }
      if (e.target.closest("#pkPlay")) { const sc = WIRE_PKTS.find(p => p.id === wirePkt) || WIRE_PKTS[0]; pkPlay(sc, typeof sc.layers === "function" ? sc.layers(wireVar) : sc.layers); return; }
      if (e.target.closest("#sjPlay")) { sjPlay(); return; }
      if (e.target.closest("#wLadPlay")) { wireLadderPlay(); return; }
      const ec = e.target.closest("[data-ec]"); if (ec) { errConn = ec.dataset.ec; $$("#errChips button").forEach(b => b.setAttribute("aria-pressed", b.dataset.ec === errConn ? "true" : "false")); wireErrList(); return; }
      const s = e.target.closest("[data-seg]"); if (s) { const r = $("#pkRow" + s.dataset.seg); if (r) { $$(".pk-row.hl").forEach(x => x.classList.remove("hl")); r.classList.add("hl"); r.scrollIntoView({ block: "nearest" }); } }
    });
    $("#wireBody").addEventListener("input", e => { if (e.target.id === "errQ") { errQ = e.target.value; wireErrList(); } });
    $("#wireBody").addEventListener("change", e => { if (e.target.id === "sjEnc") { sjEnc = e.target.checked; sjTok(0); } });
    $("#wireBody").addEventListener("keydown", e => { const n = e.target.closest(".wm-n"); if (n && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); n.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
    wireCur = store.get("wire", "map"); wireConn = store.get("wireConn", "kubectl");
  }
  wireShow();
}

function wireConnHTML(c) {
  const kv = [["Trao đổi những gì", c.what], ["Định dạng", c.fmt], ["Mã hóa trên đường đi", c.sec], ["Ai xác thực ai", c.auth], ["Cấu hình ở đâu (kubeadm)", c.cfg]];
  return '<div class="panel col" id="wireDetail"><div><p class="stepnum">KẾT NỐI ' + W_CIRC[c.n - 1] + "</p><h3>" + kEsc(c.t) + '</h3><div class="pk-pills"><span class="pill">' + kEsc(c.p) + '</span><span class="pill">' + kEsc(c.tr) + '</span><span class="pill">' + kEsc(c.fm) + '</span><span class="pill ' + c.cr[0] + '">' + (c.cr[0] === "ok" ? W_LOCK + " " : "") + kEsc(c.cr[1]) + "</span></div></div>" +
    '<div class="detail"><div class="kv">' + kv.map(r => '<div><div class="k">' + r[0] + "</div><div>" + r[1] + "</div></div>").join("") + "</div></div>" +
    '<h4 style="margin-top:6px">Mẫu gói tin (đã giải mã)</h4>' + wCode(c.sample) +
    "<h4>Xem tận mắt</h4>" + wCode(c.see) +
    '<h4>Bẫy hay gặp</h4><ul class="tight">' + c.traps.map(x => "<li>" + x + "</li>").join("") + "</ul>" +
    '<p class="small">' + (c.pk ? '<button type="button" class="btn" data-pk="' + c.pk + '">Mổ gói này theo từng tầng →</button> ' : "") + "Luyện trên cluster: " + wLabs(c.labs) + "</p></div>";
}

function wireMapDetail() {
  const c = WIRE_CONNS.find(x => x.id === wireConn) || WIRE_CONNS[0];
  $$(".wire-list button").forEach(x => x.setAttribute("aria-pressed", x.dataset.conn === c.id ? "true" : "false"));
  $("#wireDetail").outerHTML = wireConnHTML(c);
  wireCopy();
}
function wireCopy() {
  $$("#wireBody pre.code").forEach(pre => { if (pre.parentElement.querySelector(".copy")) return; const b = document.createElement("button"); b.className = "copy"; b.type = "button"; b.textContent = "Chép"; b.onclick = () => { try { navigator.clipboard.writeText(pre.textContent); b.textContent = "Đã chép"; } catch (e) {} setTimeout(() => b.textContent = "Chép", 1200); }; pre.parentElement.appendChild(b); });
}

function wirePktHTML() {
  const sc = WIRE_PKTS.find(p => p.id === wirePkt) || WIRE_PKTS[0];
  const layers = typeof sc.layers === "function" ? sc.layers(wireVar) : sc.layers;
  const eaves = wireEye === 0;
  let h = '<div class="panel col"><div class="seg" role="group" aria-label="Chọn gói tin">' + WIRE_PKTS.map(p => '<button type="button" data-pk="' + p.id + '" aria-pressed="' + (p.id === sc.id) + '">' + kEsc(p.t) + "</button>").join("") + "</div>";
  h += '<p class="small muted" style="margin:0">' + kEsc(sc.sub) + "</p>";
  h += '<div class="formrow"><div class="seg" role="group" aria-label="Góc nhìn"><button type="button" data-eye="0" aria-pressed="' + eaves + '">Người bắt gói trên dây</button><button type="button" data-eye="1" aria-pressed="' + !eaves + '">Bên nhận, đã giải mã</button></div>' +
    (sc.variants ? '<div class="seg" role="group" aria-label="Biến thể">' + sc.variants.map((v, i) => '<button type="button" data-var="' + i + '" aria-pressed="' + (i === wireVar) + '">' + kEsc(v) + "</button>").join("") + "</div>" : "") + "</div>";
  h += pkStageHTML(sc, layers);
  const total = layers.reduce((a, l) => a + l[2], 0);
  h += '<div class="pk-bar" role="group" aria-label="Gói tin theo thứ tự byte">' + layers.map((l, i) => {
    const hid = eaves && l[5];
    return '<button type="button" data-seg="' + i + '" class="pk-' + l[0] + (hid ? " enc" : "") + '" style="flex-grow:' + Math.max(l[2], 12) + '" title="' + kEsc(l[1] + " · " + l[2] + " byte") + '"><span>' + (hid ? W_LOCK : kEsc(l[1].split(" ")[0])) + "</span></button>";
  }).join("") + '</div><p class="small muted" style="margin:0">Byte đầu tiên bên trái. Tổng khoảng ' + total + " byte. Bấm một đoạn để tới tầng đó.</p>";
  h += '<div class="pk-rows">' + layers.map((l, i) => {
    const hid = eaves && l[5];
    const st = l[0] === "rest" ? (l[6] ? '<span class="pill ok">' + W_LOCK + " trên đĩa: đã mã hóa</span>" : '<span class="pill bad">trên đĩa: đọc được</span>') : "";
    return '<div class="pk-row pk-' + l[0] + (hid ? " enc" : "") + '" id="pkRow' + i + '"><div class="pk-h"><b>' + kEsc(l[1]) + '</b><span class="small muted">' + W_GROUP[l[0]] + " · " + l[2] + " byte</span>" +
      (hid ? '<span class="pill ok">' + W_LOCK + " mã hóa</span>" : '<span class="pill' + (eaves ? " bad" : "") + '">' + (eaves ? "đọc được" : "rõ") + "</span>") + st + "</div>" +
      (hid ? '<pre class="pk-f pk-x">' + "▒".repeat(Math.min(48, Math.max(8, l[2] / 4 | 0))) + "\nKhông đọc được nếu không có khóa phiên</pre>" : '<pre class="pk-f">' + kEsc(l[3]) + "</pre>") +
      (l[4] ? '<p class="small muted">' + kEsc(l[4]) + "</p>" : "") + "</div>";
  }).join("") + "</div>";
  h += '<div class="split even"><div class="fix"><b>Người bắt gói thấy</b><br><span class="small">' + kEsc(sc.see) + '</span></div><div class="fix" style="border-color:var(--accent)"><b>Không thấy</b><br><span class="small">' + kEsc(sc.hide) + "</span></div></div></div>";
  return h;
}

function wireShow() {
  $$("#wireTabs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.w === wireCur ? "true" : "false"));
  const box = $("#wireBody");
  let h = "";
  if (wireCur === "map") {
    const c = WIRE_CONNS.find(x => x.id === wireConn) || WIRE_CONNS[0];
    h += '<div class="panel col"><h4>Ai nói chuyện với ai</h4><p class="small muted">Mô hình hub-and-spoke: mọi thành phần gọi vào kube-apiserver, chỉ apiserver chạm vào etcd. Bấm một số, một đường hoặc một thành phần để xem gói tin chạy trên kết nối đó.</p><div class="stage" id="wmStage"></div>' +
      '<div class="controls"><button class="btn primary" type="button" id="wmTour">▶ Hành trình một lệnh kubectl</button><span class="wm-leg"><i class="enc"></i>đã mã hóa (TLS/mTLS)</span><span class="wm-leg"><i class="plain"></i>dạng rõ trên mạng</span><span class="wm-leg"><i class="loc"></i>cục bộ trong node</span></div><p class="hint" id="wmCap" aria-live="polite" style="margin:0">Hành trình chạy lần lượt các kết nối khi tạo một Deployment, từ kubectl tới Pod chạy trên node.</p></div>';
    h += '<div class="wire-split"><div class="panel col wire-list" role="list">' + WIRE_CONNS.map(x => '<button type="button" role="listitem" data-conn="' + x.id + '" aria-pressed="' + (x.id === c.id) + '"><span class="n">' + W_CIRC[x.n - 1] + '</span><span class="t">' + kEsc(x.t) + '<small>' + kEsc(x.p + " · " + x.tr) + '</small></span><span class="pill ' + x.cr[0] + '">' + kEsc(x.cr[1].split(",")[0]) + "</span></button>").join("") + "</div>" + wireConnHTML(c) + "</div>";
  } else if (wireCur === "pkt") {
    h += wirePktHTML();
  } else if (wireCur === "err") {
    h += wireErrHTML();
  } else if (wireCur === "obs") {
    h += wireObsHTML();
  } else if (wireCur === "tls") {
    h += '<div class="panel col"><h4>Bắt tay TLS 1.3 hai chiều (mTLS)</h4><p class="small muted">Mũi tên đen: dạng rõ. Mũi tên tím có khóa: đã mã hóa bằng khóa phiên.</p><div id="sqTls"></div><p class="small muted">apiserver xin cert client nhưng không bắt buộc: client không có cert vẫn kết nối được và xác thực bằng token trong header. Khóa phiên mới cho mỗi kết nối (forward secrecy): lộ ca.key sau này cũng không giải mã được gói đã bắt trước đó.</p></div>' +
      '<div class="panel col"><h4>Node mới vào cluster: TLS bootstrap</h4><div id="sqBoot"></div></div>';
    h += '<div class="panel"><h4>Danh tính nằm ở đâu trong gói tin</h4><div class="tbl"><table><thead><tr><th>Cách</th><th>Nằm ở</th><th>apiserver kiểm</th><th>Thành user / group</th></tr></thead><tbody>' + WIRE_IDS.map(r => "<tr><td><b>" + r[0] + "</b></td><td>" + r[1] + "</td><td>" + r[2] + "</td><td>" + r[3] + "</td></tr>").join("") + '</tbody></table></div><p class="small muted" style="margin-top:10px">Kubernetes không có object User: user chỉ là chuỗi lấy từ cert hoặc token. Thứ tự xử lý một request: xác thực (authn) → phân quyền (Node, RBAC) → admission → validate → lưu etcd.</p></div>';
    h += '<div class="split even"><div class="panel col"><h4>JWT của ServiceAccount: ký, không mã hóa</h4>' + wCode(`eyJhbGciOiJSUzI1NiIsImtpZCI6Il9uSkF3b2lf….eyJhdWQiOlsiaHR0cHM6Ly9rdWJl….Qx7f0c…
└──── header (base64url) ────┘ └──── payload (base64url) ────┘ └ chữ ký RS256 ┘

header   {"alg":"RS256","kid":"_nJAwoi_yJG9a-CeSKGxMHcbgZ86VyJhSvv_oq3vzFY"}
payload  {"sub":"system:serviceaccount:default:default",
          "aud":["https://kubernetes.default.svc.cluster.local"],
          "kubernetes.io":{"namespace":"default","pod":{"name":"web-66d47686b4-4wzmh",…}}, "exp":…}
chữ ký   = RSA(sa.key, sha256(header "." payload))`) + '<p class="small muted">Ai cũng giải base64 được để đọc payload. Chữ ký chỉ chứng minh token do cluster cấp và chưa bị sửa. Lấy được file token là dùng được quyền của ServiceAccount.</p></div>' +
      '<div class="panel col"><h4>Mã hóa đối xứng và bất đối xứng dùng ở đâu</h4><div class="tbl"><table><tbody>' + [
        ["Bất đối xứng (RSA, ECDSA, Ed25519)", "Chữ ký trên chứng chỉ, CertificateVerify khi bắt tay, chữ ký JWT"],
        ["Trao đổi khóa (ECDHE X25519, Curve25519)", "Sinh khóa phiên TLS, WireGuard"],
        ["Đối xứng có xác thực (AES-GCM, ChaCha20-Poly1305)", "Dữ liệu trong kết nối TLS và WireGuard"],
        ["Đối xứng lúc lưu (AES-CBC, AES-GCM, XSalsa20)", "EncryptionConfiguration cho Secret trong etcd"],
        ["Băm (SHA-256)", "Digest image, --discovery-token-ca-cert-hash, annotation checksum/config"],
        ["Không phải mã hóa", "base64 trong Secret JSON, base64url trong JWT: chỉ là cách viết bytes thành chữ"]
      ].map(r => "<tr><td><b>" + kEsc(r[0]) + "</b></td><td>" + kEsc(r[1]) + "</td></tr>").join("") + "</tbody></table></div></div></div>";
  } else if (wireCur === "pki") {
    h += '<div class="panel"><h4>Thư mục /etc/kubernetes/pki và các kubeconfig</h4><p class="small muted">kubeadm tạo ba CA độc lập: cluster (<code>ca</code>), etcd (<code>etcd/ca</code>) và aggregation (<code>front-proxy-ca</code>). Một cert chỉ được tin ở nơi tin CA đã ký nó.</p><div class="tbl"><table><thead><tr><th>File</th><th>Ký bởi</th><th>Subject</th><th>Dùng cho</th><th>Hạn</th></tr></thead><tbody>' +
      WIRE_PKI.map(r => "<tr><td><code>" + kEsc(r[0]) + "</code></td><td>" + kEsc(r[1]) + '</td><td class="small">' + kEsc(r[2]) + "</td><td>" + kEsc(r[3]) + "</td><td>" + kEsc(r[4]) + "</td></tr>").join("") + "</tbody></table></div></div>";
    h += '<div class="split even"><div class="panel col"><h4>Kiểm tra và gia hạn</h4>' + wCode(`sudo kubeadm certs check-expiration
sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout \\
  -subject -issuer -dates -ext subjectAltName
sudo kubeadm certs renew all
# static Pod không tự nạp cert mới: khởi động lại apiserver, controller-manager, scheduler, etcd
sudo mv /etc/kubernetes/manifests/*.yaml /tmp/ && sleep 20 && sudo mv /tmp/kube-*.yaml /tmp/etcd.yaml /etc/kubernetes/manifests/
sudo cp /etc/kubernetes/admin.conf ~/.kube/config
# kubeadm upgrade apply tự gia hạn các cert này`) + "</div>" +
      '<div class="panel col"><h4>Thêm tên hoặc IP vào cert của apiserver</h4>' + wCode(`kubectl -n kube-system get cm kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' > kc.yaml
# thêm vào kc.yaml:
#   apiServer:
#     certSANs: ["lb.lab", "10.0.0.100"]
sudo mv /etc/kubernetes/pki/apiserver.{crt,key} /tmp/
sudo kubeadm init phase certs apiserver --config kc.yaml
# rồi khởi động lại kube-apiserver như trên và kiểm SAN bằng openssl`) + '<p class="small muted">Duyệt cert cho user mới bằng CSR: xem Lab 24.</p></div></div>';
  } else if (wireCur === "rest") {
    h += '<div class="panel col"><h4>Hành trình của một Secret</h4>' + sjHTML() + '<div class="tbl"><table id="wireJourney"><thead><tr><th>#</th><th>Chặng</th><th>Dạng dữ liệu</th><th>Được bảo vệ bằng</th></tr></thead><tbody>' + WIRE_JOURNEY.map(r => "<tr><td>" + r[0] + "</td><td><b>" + kEsc(r[1]) + "</b></td><td>" + kEsc(r[2]) + "</td><td>" + (r[4] ? '<span class="pill ' + r[4] + '">' + kEsc(r[3]) + "</span>" : kEsc(r[3])) + "</td></tr>").join("") + '</tbody></table></div><p class="small muted" style="margin-top:10px">Chặng yếu nhất mặc định là 4: etcd và mọi bản sao lưu của nó. EncryptionConfiguration chỉ vá chặng đó; chặng 6 và 7 cần RBAC chặt (ai được get secret, ai được exec) và hệ thống quản lý bí mật bên ngoài nếu cần.</p></div>';
    h += '<div class="split even"><div class="panel col"><h4>Bật mã hóa Secret trong etcd</h4>' + wCode(`# 1. Tạo khóa 32 byte và file cấu hình trên MỌI control plane
head -c 32 /dev/urandom | base64
sudo mkdir -p /etc/kubernetes/enc
sudo tee /etc/kubernetes/enc/enc.yaml <<'EOF'
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: ["secrets"]
    providers:
      - aescbc:                 # provider đầu tiên dùng để MÃ HÓA
          keys:
            - name: key1
              secret: <chuỗi base64 ở trên>
      - identity: {}            # vẫn ĐỌC được dữ liệu cũ chưa mã hóa
EOF

# 2. kube-apiserver.yaml: thêm cờ và mount thư mục
#   - --encryption-provider-config=/etc/kubernetes/enc/enc.yaml
#   volumeMounts: {name: enc, mountPath: /etc/kubernetes/enc, readOnly: true}
#   volumes:      {name: enc, hostPath: {path: /etc/kubernetes/enc, type: DirectoryOrCreate}}

# 3. Chờ apiserver chạy lại, rồi ghi lại mọi Secret cũ để chúng được mã hóa
kubectl get secrets -A -o json | kubectl replace -f -`) + "</div>" +
      '<div class="panel col"><h4>Kiểm tra bằng etcdctl</h4>' + wCode(`sudo etcdctl --endpoints=https://127.0.0.1:2379 \\
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \\
  --cert=/etc/kubernetes/pki/apiserver-etcd-client.crt \\
  --key=/etc/kubernetes/pki/apiserver-etcd-client.key \\
  get /registry/secrets/default/db --print-value-only | hexdump -C | head -4`) +
      '<p class="small"><b>Trước</b> (bắt thật trên cluster lab):</p>' + wCode(`00000000  6b 38 73 00 0a 0c 0a 02  76 31 12 06 53 65 63 72  |k8s.....v1..Secr|
00000010  65 74 12 cd 01 0a ad 01  0a 02 64 62 12 00 1a 07  |et........db....|
000000c0  7b 7d 7d 42 00 12 13 0a  08 70 61 73 73 77 6f 72  |{}}B.....passwor|
000000d0  64 12 07 53 33 63 72 33  74 21 1a 06 4f 70 61 71  |d..S3cr3t!..Opaq|`) +
      '<p class="small"><b>Sau</b> khi bật aescbc và replace:</p>' + wCode(`00000000  6b 38 73 3a 65 6e 63 3a  61 65 73 63 62 63 3a 76  |k8s:enc:aescbc:v|
00000010  31 3a 6b 65 79 31 3a 9c  41 e0 7d 2b 5a 13 c8 f0  |1:key1:.A.}+Z...|
00000020  3e 77 a1 0b 64 d2 19 8e  c4 55 0f 6a b3 27 e9 41  |>w..d....U.j.'.A|`) +
      '<p class="small muted">Xoay khóa: thêm key2 lên đầu danh sách, khởi động lại apiserver, replace mọi Secret, rồi mới bỏ key1. Xóa key1 trước là mất Secret.</p></div></div>';
    h += '<div class="panel"><h4>Các provider</h4><div class="tbl"><table><thead><tr><th>Provider</th><th>Thuật toán</th><th>Ghi chú</th></tr></thead><tbody>' + WIRE_PROVIDERS.map(r => "<tr><td><code>" + kEsc(r[0]) + "</code></td><td>" + kEsc(r[1]) + "</td><td>" + kEsc(r[2]) + "</td></tr>").join("") + "</tbody></table></div></div>";
  } else {
    h += '<div class="panel"><div class="tbl"><table id="wireCheat"><thead><tr><th>#</th><th>Kết nối</th><th>Cổng</th><th>Vận chuyển</th><th>Định dạng</th><th>Mã hóa</th><th>Xác thực</th></tr></thead><tbody>' +
      WIRE_CONNS.map(c => '<tr><td>' + W_CIRC[c.n - 1] + '</td><td><button type="button" class="linkbtn" data-conn="' + c.id + '">' + kEsc(c.t) + "</button></td><td><code>" + kEsc(c.p) + "</code></td><td>" + kEsc(c.tr) + "</td><td>" + kEsc(c.fm) + '</td><td><span class="pill ' + c.cr[0] + '">' + kEsc(c.cr[1]) + "</span></td><td>" + kEsc(c.au) + "</td></tr>").join("") + "</tbody></table></div></div>";
    h += '<div class="panel"><h4>Cổng cần mở (kubeadm)</h4><div class="tbl"><table><thead><tr><th>Cổng</th><th>Ở đâu</th><th>Ai gọi</th></tr></thead><tbody>' + [
      ["6443 TCP", "control plane", "mọi người, mọi node"], ["2379-2380 TCP", "control plane (etcd)", "apiserver, etcd khác"], ["10250 TCP", "mọi node (kubelet)", "apiserver, metrics-server"],
      ["10257 / 10259 TCP", "control plane", "health/metrics của controller-manager / scheduler (chỉ localhost)"], ["10256 TCP", "mọi node", "health của kube-proxy"],
      ["30000-32767 TCP/UDP", "mọi node", "NodePort"], ["4789 UDP · 179 TCP · 51820 UDP", "mọi node", "Calico VXLAN · BGP · WireGuard (tùy chế độ)"], ["53 UDP/TCP", "Pod CoreDNS", "mọi Pod"]
    ].map(r => "<tr><td><code>" + kEsc(r[0]) + "</code></td><td>" + kEsc(r[1]) + "</td><td>" + kEsc(r[2]) + "</td></tr>").join("") + "</tbody></table></div></div>";
  }
  wmTok++; wmTourOn = false;
  box.innerHTML = h;
  wireCopy();
  mmdRender(box);
  if (wireCur === "map") { wmBuild($("#wmStage")); wmLoop(wireConn); }
  if (wireCur === "tls") { seqStage($("#sqTls"), SEQ_TLS[0], SEQ_TLS[1]); seqStage($("#sqBoot"), SEQ_BOOT[0], SEQ_BOOT[1]); }
  if (wireCur === "rest") sjTok(0);
  if (wireCur === "err") wireErrList();
}
onShow.wire = wireInit;
if (current === "wire" || (location.hash || "").slice(1) === "wire") wireInit();
