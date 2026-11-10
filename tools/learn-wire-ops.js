const wCodeLater = t => '<div class="codewrap"><pre class="code">' + kEsc(t) + '</pre></div>';
/* ---------- Giao tiếp & mã hóa: sự cố, cách khắc phục và quan sát (observability) ---------- */
/* c: id kết nối trong WIRE_CONNS · m: thông báo lỗi thật · s: triệu chứng · why: nguyên nhân · chk: lệnh kiểm tra · fix: cách sửa */
const WIRE_ERRS = [
  { c: "kubectl", m: "The connection to the server 10.0.0.10:6443 was refused - did you specify the right host or port?", s: "Mọi lệnh kubectl đều lỗi ngay lập tức.", why: "Không có tiến trình nào nghe ở 6443: kube-apiserver chết hoặc restart liên tục, thường do ai đó sửa sai /etc/kubernetes/manifests/kube-apiserver.yaml.",
    chk: "ssh cp-1\nsudo crictl ps -a | grep kube-apiserver\nsudo crictl logs $(sudo crictl ps -a --name kube-apiserver -q | head -1) 2>&1 | tail -20\nsudo journalctl -u kubelet --since '10 min ago' | grep -i apiserver | tail", fix: "Đọc dòng lỗi cuối trong log (sai tên cờ, sai đường dẫn cert, YAML hỏng), sửa manifest. kubelet tự tạo lại static Pod sau khi file đổi.\nKhông có container nào: kiểm tra kubelet có chạy (systemctl status kubelet) và manifest có parse được không." },
  { c: "kubectl", m: "Unable to connect to the server: dial tcp 10.0.0.10:6443: i/o timeout", s: "kubectl treo khoảng 30 giây rồi báo lỗi.", why: "Gói không tới được hoặc không có trả lời: sai IP trong kubeconfig, firewall, load balancer trước apiserver không có backend khỏe.",
    chk: "kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'\nnc -vz 10.0.0.10 6443\ncurl -k https://10.0.0.10:6443/livez", fix: "Sửa server trong kubeconfig, mở TCP 6443, hoặc sửa health check của load balancer (nên kiểm /readyz)." },
  { c: "kubectl", m: "Unable to connect to the server: tls: failed to verify certificate: x509: certificate signed by unknown authority", s: "Kết nối được nhưng kubectl từ chối tin server.", why: "certificate-authority-data trong kubeconfig không phải CA đã ký apiserver.crt (kubeconfig của cluster khác, hoặc cluster dựng lại với CA mới).",
    chk: "kubectl config view --raw --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 -d | openssl x509 -noout -subject -fingerprint\nsudo openssl x509 -in /etc/kubernetes/pki/ca.crt -noout -subject -fingerprint", fix: "Lấy lại kubeconfig đúng: sudo cp /etc/kubernetes/admin.conf ~/.kube/config. Đừng dùng --insecure-skip-tls-verify để chữa cháy." },
  { c: "kubectl", m: "tls: failed to verify certificate: x509: certificate is valid for 10.96.0.1, 10.0.0.10, not 10.0.0.100", s: "Gọi qua IP hoặc tên mới (load balancer, VIP) thì lỗi, gọi IP cũ thì được.", why: "Tên/IP đang gọi không có trong SAN của apiserver.crt.",
    chk: "sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -ext subjectAltName", fix: "Thêm vào apiServer.certSANs trong ClusterConfiguration, xóa apiserver.crt/key, chạy kubeadm init phase certs apiserver --config kc.yaml, khởi động lại kube-apiserver (xem tab Chứng chỉ kubeadm)." },
  { c: "kubectl", m: "x509: certificate has expired or is not yet valid: current time 2027-03-02T08:00:00Z is after 2027-03-01T07:12:44Z", s: "Cluster chạy đúng 1 năm thì kubectl và cả control plane cùng lỗi.", why: "Cert lá do kubeadm tạo có hạn 1 năm. \"not yet valid\" thì là đồng hồ máy lệch.",
    chk: "sudo kubeadm certs check-expiration\ndate -u; timedatectl", fix: "sudo kubeadm certs renew all\nKhởi động lại apiserver, controller-manager, scheduler, etcd (static Pod không tự nạp cert mới)\nsudo cp /etc/kubernetes/admin.conf ~/.kube/config\nĐồng hồ lệch: bật chrony/NTP." },
  { c: "kubectl", m: "error: You must be logged in to the server (Unauthorized)", s: "Kết nối TLS được nhưng mọi lệnh trả 401.", why: "Xác thực thất bại: client cert hết hạn hoặc không do CA của cluster ký, token sai hoặc hết hạn, OIDC token cũ.",
    chk: "kubectl config view --raw --minify -o jsonpath='{.users[0].user.client-certificate-data}' | base64 -d | openssl x509 -noout -subject -issuer -enddate\nkubectl auth whoami", fix: "Cấp lại cert (CSR, Lab 24) hoặc lấy token mới. Phân biệt với 403: 401 là chưa biết bạn là ai." },
  { c: "kubectl", m: "Error from server (Forbidden): pods is forbidden: User \"jane\" cannot list resource \"pods\" in API group \"\" in the namespace \"dev\"", s: "Lệnh trả 403 kèm đúng tên user và quyền bị thiếu.", why: "Xác thực đã xong; RBAC không có Role/RoleBinding cho verb và resource đó.",
    chk: "kubectl auth can-i list pods -n dev --as jane\nkubectl get rolebinding,clusterrolebinding -A -o wide | grep jane", fix: "kubectl create role pod-reader -n dev --verb=get,list,watch --resource=pods\nkubectl create rolebinding jane-read -n dev --role=pod-reader --user=jane" },
  { c: "kubectl", m: "Error from server (TooManyRequests): the server has received too many requests and has asked us to try again later", s: "Lệnh lúc được lúc không, controller chậm hẳn khi tải cao.", why: "API Priority and Fairness (APF) từ chối request vì hàng đợi của flow schema đầy; thường do một client gọi list/watch dồn dập.",
    chk: "kubectl get --raw /metrics | grep apiserver_flowcontrol_rejected_requests_total\nkubectl get flowschemas,prioritylevelconfigurations", fix: "Tìm client gây tải (audit log, user-agent), giảm tần suất hoặc dùng informer thay cho list liên tục; điều chỉnh PriorityLevelConfiguration nếu cần." },

  { c: "etcd", m: "Error: context deadline exceeded", s: "etcdctl treo vài giây rồi báo lỗi, dù etcd đang chạy.", why: "etcdctl thiếu hoặc sai --cacert/--cert/--key (dùng nhầm CA của cluster thay vì etcd CA), hoặc sai endpoint.",
    chk: "sudo grep -E 'listen-client|cert-file|trusted-ca' /etc/kubernetes/manifests/etcd.yaml", fix: "sudo etcdctl --endpoints=https://127.0.0.1:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/server.crt --key=/etc/kubernetes/pki/etcd/server.key endpoint health" },
  { c: "etcd", m: "\"Unable to connect to the server\" … grpc: addrConn.createTransport failed to connect to {Addr: \"127.0.0.1:2379\"} … connect: connection refused", s: "Trong log kube-apiserver; apiserver restart liên tục, kubectl báo connection refused.", why: "etcd không chạy hoặc không nghe ở địa chỉ apiserver dùng: manifest etcd hỏng, data-dir sai sau khi restore, đĩa đầy.",
    chk: "sudo crictl ps -a | grep etcd\nsudo crictl logs $(sudo crictl ps -a --name etcd -q | head -1) 2>&1 | tail\ndf -h /var/lib/etcd", fix: "Sửa etcd.yaml (đường dẫn hostPath của data-dir phải khớp --data-dir sau khi restore), giải phóng đĩa." },
  { c: "etcd", m: "etcdserver: mvcc: database space exceeded", s: "Mọi lệnh ghi đều lỗi, đọc vẫn được.", why: "Database etcd vượt --quota-backend-bytes (mặc định 2 GiB), etcd bật alarm NOSPACE và chỉ cho đọc.",
    chk: "etcdctl … endpoint status -w table\netcdctl … alarm list", fix: "rev=$(etcdctl … endpoint status -w json | jq '.[0].Status.header.revision')\netcdctl … compact $rev\netcdctl … defrag\netcdctl … alarm disarm\nSau đó tìm nguồn ghi nhiều (Event, CRD) và cân nhắc tăng quota." },
  { c: "etcd", m: "etcdserver: request timed out / etcdserver: leader changed", s: "apiserver chậm, lệnh ghi thỉnh thoảng lỗi.", why: "etcd không kịp fsync WAL (đĩa chậm, đĩa dùng chung với tải khác) hoặc mạng giữa member chập chờn, leader bị bầu lại liên tục.",
    chk: "kubectl get --raw /metrics | grep etcd_request_duration_seconds_count | head -3\ncurl -s http://127.0.0.1:2381/metrics | grep -E 'wal_fsync_duration_seconds_(sum|count)|leader_changes_seen_total'", fix: "Đưa etcd lên SSD/NVMe riêng, p99 wal_fsync dưới 10ms; giảm tải ghi; kiểm tra độ trễ mạng giữa control plane." },

  { c: "raft", m: "rejected connection on peer endpoint … tls: failed to verify certificate: x509: certificate is valid for 10.0.0.11, not 10.0.0.12", s: "Member mới không vào được cluster etcd, log báo lỗi TLS ở cổng 2380.", why: "peer.crt của member không có IP mà member khác dùng để gọi.",
    chk: "sudo openssl x509 -in /etc/kubernetes/pki/etcd/peer.crt -noout -ext subjectAltName", fix: "Tạo lại cert peer cho đúng IP: sudo kubeadm init phase certs etcd-peer (sau khi xóa peer.crt/key cũ), khởi động lại etcd." },
  { c: "raft", m: "etcdserver: no leader / etcdserver: unhealthy cluster", s: "Mất quyền ghi toàn cluster, apiserver trả lỗi 500.", why: "Mất đa số member (ví dụ 2/3 control plane tắt): Raft không bầu được leader.",
    chk: "etcdctl … endpoint status --cluster -w table\netcdctl … member list -w table", fix: "Đưa member về lại. Mất vĩnh viễn đa số: khôi phục từ snapshot thành cluster mới (etcdutl snapshot restore) rồi thêm lại member." },

  { c: "ctrl", m: "Deployment tạo xong nhưng không có ReplicaSet, không có Pod", s: "kubectl get rs trống, Events không có gì.", why: "kube-controller-manager không chạy hoặc không tới được apiserver (cert trong controller-manager.conf hết hạn, manifest sai).",
    chk: "kubectl -n kube-system get pod -l component=kube-controller-manager\nkubectl -n kube-system logs -l component=kube-controller-manager --tail=20\nkubectl -n kube-system get lease kube-controller-manager", fix: "Sửa manifest /etc/kubernetes/manifests/kube-controller-manager.yaml hoặc gia hạn cert, chờ Pod Running." },
  { c: "ctrl", m: "Pod đứng Pending, không có event FailedScheduling", s: "kubectl describe pod không có dòng Scheduled nào; spec.nodeName trống.", why: "kube-scheduler không chạy hoặc Pod chỉ định schedulerName của scheduler không tồn tại.",
    chk: "kubectl -n kube-system get pod -l component=kube-scheduler\nkubectl get pod web -o jsonpath='{.spec.schedulerName}'", fix: "Sửa manifest kube-scheduler, hoặc sửa schedulerName. Nếu có event FailedScheduling thì scheduler vẫn chạy: đọc lý do (tài nguyên, taint, affinity)." },
  { c: "ctrl", m: "leaderelection lost / failed to renew lease kube-system/kube-scheduler: timed out waiting for the condition", s: "controller-manager hoặc scheduler tự thoát và restart.", why: "Không gia hạn được Lease kịp: apiserver hoặc etcd quá chậm.",
    chk: "kubectl -n kube-system logs -l component=kube-scheduler --previous | tail", fix: "Xử lý độ trễ của apiserver/etcd (xem các lỗi etcd ở trên)." },

  { c: "kubelet", m: "Node NotReady: Kubelet stopped posting node status", s: "kubectl get nodes báo NotReady; sau vài phút Pod trên node bị đuổi.", why: "kubelet chết, không tới được apiserver, hoặc không gia hạn được Lease trong kube-node-lease.",
    chk: "ssh node01\nsudo systemctl status kubelet\nsudo journalctl -u kubelet -n 50 --no-pager\nkubectl get lease -n kube-node-lease node01 -o jsonpath='{.spec.renewTime}'", fix: "sudo systemctl enable --now kubelet. Đọc dòng lỗi đầu tiên trong journal: cấu hình, swap, cert, CRI." },
  { c: "kubelet", m: "part of the existing bootstrap client certificate in /etc/kubernetes/kubelet.conf is expired", s: "kubelet không khởi động, node NotReady.", why: "Cert client của kubelet hết hạn mà không xoay vòng được (node tắt quá lâu, tắt rotateCertificates).",
    chk: "sudo openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem -noout -enddate", fix: "Trên control plane: kubeadm kubeconfig user --org system:nodes --client-name system:node:node01 > kubelet.conf\nChép vào node01 thay /etc/kubernetes/kubelet.conf, xóa /var/lib/kubelet/pki/kubelet-client*, restart kubelet. Khi có kubelet-client-current.pem mới, trỏ kubelet.conf về file đó." },
  { c: "kubelet", m: "failed to run Kubelet: running with swap on is not supported, please disable swap", s: "kubelet thoát ngay sau khi start.", why: "Node bật swap trong khi kubelet có failSwapOn: true (mặc định).",
    chk: "swapon --show", fix: "sudo swapoff -a và bỏ dòng swap trong /etc/fstab (hoặc cấu hình hỗ trợ swap của kubelet nếu cố ý dùng)." },

  { c: "exec", m: "Error from server: error dialing backend: dial tcp 10.0.0.21:10250: i/o timeout", s: "get pods chạy, nhưng logs, exec, port-forward, top đều lỗi.", why: "apiserver không tới được kubelet :10250 (firewall, IP node trong Node.status sai, kubelet chết).",
    chk: "kubectl get node node01 -o jsonpath='{.status.addresses}'\nnc -vz 10.0.0.21 10250   # chạy trên control plane", fix: "Mở TCP 10250 từ control plane tới node; sửa --node-ip của kubelet nếu node có nhiều card mạng." },
  { c: "exec", m: "error: unable to upgrade connection: Forbidden (user=kube-apiserver-kubelet-client, verb=create, resource=nodes, subresource=proxy)", s: "exec và port-forward bị từ chối, logs có thể vẫn được.", why: "kubelet hỏi apiserver (SubjectAccessReview) và user của apiserver thiếu quyền nodes/proxy.",
    chk: "kubectl auth can-i create nodes/proxy --as kube-apiserver-kubelet-client", fix: "Khôi phục ClusterRoleBinding cho user này tới ClusterRole system:kubelet-api-admin." },
  { c: "exec", m: "Failed to scrape node … x509: cannot validate certificate for 10.0.0.21 because it doesn't contain any IP SANs", s: "kubectl top báo Metrics API not available; log metrics-server có dòng này.", why: "metrics-server kiểm cert server của kubelet, mà cert đó tự ký và không có IP SAN.",
    chk: "kubectl -n kube-system logs deploy/metrics-server | tail", fix: "Lab: thêm --kubelet-insecure-tls cho metrics-server.\nProduction: serverTLSBootstrap: true trong cấu hình kubelet, rồi kubectl certificate approve các CSR kubelet-serving." },

  { c: "cri", m: "validate CRI v1 runtime API for endpoint \"unix:///run/containerd/containerd.sock\": rpc error: code = Unimplemented desc = unknown service runtime.v1.RuntimeService", s: "kubelet không chạy được, kubeadm preflight cũng báo lỗi.", why: "Plugin CRI của containerd bị tắt (gói containerd của Docker để disabled_plugins = [\"cri\"]).",
    chk: "grep disabled_plugins /etc/containerd/config.toml", fix: "containerd config default | sudo tee /etc/containerd/config.toml\nĐặt SystemdCgroup = true, rồi sudo systemctl restart containerd kubelet" },
  { c: "cri", m: "connect: no such file or directory (unix:///run/containerd/containerd.sock)", s: "crictl và kubelet đều không nói chuyện được với runtime.", why: "containerd không chạy hoặc kubelet trỏ sai socket.",
    chk: "sudo systemctl status containerd\ngrep containerRuntimeEndpoint /var/lib/kubelet/config.yaml\ncat /etc/crictl.yaml", fix: "sudo systemctl enable --now containerd; sửa containerRuntimeEndpoint cho đúng." },

  { c: "cni", m: "container runtime network not ready: NetworkReady=false reason:NetworkPluginNotReady message:Network plugin returns error: cni plugin not initialized", s: "Node NotReady ngay sau khi kubeadm init/join; CoreDNS Pending.", why: "Chưa cài CNI, hoặc /etc/cni/net.d trống vì Pod của CNI trên node đó chưa chạy.",
    chk: "ls /etc/cni/net.d /opt/cni/bin\nkubectl -n calico-system get pod -o wide   # hoặc kube-system với Flannel/Cilium", fix: "Cài CNI (Lab 40); nếu đã cài, xem vì sao Pod CNI trên node đó lỗi." },
  { c: "cni", m: "Failed to create pod sandbox: … failed to setup network for sandbox \"…\": plugin type=\"calico\" failed (add): …", s: "Pod đứng ContainerCreating, Event FailedCreatePodSandBox.", why: "CNI plugin chạy nhưng lỗi: không tới được apiserver/datastore, hết IP trong IPAM, cấu hình sai.",
    chk: "kubectl describe pod web | tail\nsudo journalctl -u containerd | grep -i cni | tail", fix: "Sửa theo dòng sau \"failed (add)\": ví dụ \"no IP addresses available in range set\" là hết IP trong podCIDR của node." },

  { c: "reg", m: "Failed to pull image \"nginx:1.277\": … not found", s: "ErrImagePull rồi ImagePullBackOff.", why: "Sai tên hoặc tag image.", chk: "kubectl describe pod web | grep -A3 Failed\nsudo crictl pull nginx:1.277", fix: "kubectl set image deploy/web nginx=nginx:1.27" },
  { c: "reg", m: "pull access denied, repository does not exist or may require authorization: … 401 Unauthorized", s: "ImagePullBackOff với registry private.", why: "Thiếu imagePullSecrets, Secret ở namespace khác, hoặc thông tin đăng nhập sai.",
    chk: "kubectl get pod web -o jsonpath='{.spec.imagePullSecrets}'\nkubectl get secret regcred -n <ns-của-pod>", fix: "kubectl create secret docker-registry regcred --docker-server=… --docker-username=… --docker-password=… -n <ns>\nThêm imagePullSecrets vào Pod hoặc vào ServiceAccount." },
  { c: "reg", m: "failed to do request: … x509: certificate signed by unknown authority", s: "Kéo image từ registry nội bộ lỗi TLS.", why: "containerd không tin CA của registry.",
    chk: "ls /etc/containerd/certs.d/", fix: "/etc/containerd/certs.d/registry.local:5000/hosts.toml với ca = \"/etc/containerd/certs.d/registry.local:5000/ca.crt\" (kiểm config_path trong config.toml trỏ tới certs.d)." },
  { c: "reg", m: "toomanyrequests: You have reached your pull rate limit", s: "Docker Hub từ chối khi nhiều node kéo cùng lúc.", why: "Giới hạn lượt kéo ẩn danh theo IP.", chk: "kubectl get events -A | grep -i toomanyrequests", fix: "Dùng mirror/registry cache nội bộ, đăng nhập Docker Hub qua imagePullSecrets, hoặc dùng registry khác." },

  { c: "sa", m: "pods is forbidden: User \"system:serviceaccount:default:default\" cannot list resource \"pods\" in API group \"\" in the namespace \"default\"", s: "Ứng dụng gọi API nhận 403.", why: "Token hợp lệ nhưng ServiceAccount chưa được cấp quyền.",
    chk: "kubectl auth can-i list pods --as=system:serviceaccount:default:default", fix: "Tạo ServiceAccount riêng, Role tối thiểu, RoleBinding; đặt serviceAccountName trong Pod (Lab 23)." },
  { c: "sa", m: "Unauthorized (401) từ trong Pod sau một thời gian chạy", s: "Ứng dụng chạy được vài giờ hoặc vài ngày rồi bị 401.", why: "Ứng dụng đọc file token một lần lúc khởi động; kubelet đã đổi token mới, token cũ hết hạn.",
    chk: "kubectl get --raw /metrics | grep serviceaccount_stale_tokens_total", fix: "Dùng client-go hoặc thư viện chính thức mới (tự đọc lại file token), hoặc tự đọc lại file định kỳ." },

  { c: "dns", m: ";; connection timed out; no servers could be reached", s: "nslookup trong Pod treo; gọi bằng IP thì được.", why: "Không tới được CoreDNS: CoreDNS chết, kube-proxy hỏng, hoặc NetworkPolicy egress chưa mở UDP/TCP 53.",
    chk: "kubectl -n kube-system get pod -l k8s-app=kube-dns -o wide\nkubectl -n kube-system get endpointslices -l kubernetes.io/service-name=kube-dns\nkubectl get networkpolicy -n <ns>", fix: "Sửa CoreDNS; thêm egress tới namespace kube-system, label k8s-app: kube-dns, cổng 53 UDP và TCP." },
  { c: "dns", m: "** server can't find web.default.svc.cluster.local: NXDOMAIN", s: "DNS trả lời nhưng không có tên đó.", why: "Service không tồn tại, sai namespace, hoặc gọi tên ngắn từ namespace khác.",
    chk: "kubectl get svc -A | grep web", fix: "Gọi đúng web.<namespace> hoặc FQDN web.<namespace>.svc.cluster.local." },
  { c: "dns", m: "[FATAL] plugin/loop: Loop (127.0.0.1:55953 -> :53) detected for zone \".\"", s: "CoreDNS CrashLoopBackOff.", why: "Node dùng systemd-resolved: /etc/resolv.conf của node trỏ 127.0.0.53, CoreDNS forward về chính nó.",
    chk: "cat /etc/resolv.conf   # trên node\ngrep resolvConf /var/lib/kubelet/config.yaml", fix: "resolvConf: /run/systemd/resolve/resolv.conf trong cấu hình kubelet, restart kubelet, xóa Pod CoreDNS." },

  { c: "pod", m: "Pod cùng node gọi nhau được, khác node thì timeout", s: "Chỉ lưu lượng qua node khác bị mất.", why: "Firewall chặn đường overlay hoặc BGP giữa các node: UDP 4789 (Calico VXLAN), UDP 8472 (Flannel, Cilium), IP protocol 4 (IPIP), TCP 179 (BGP).",
    chk: "sudo tcpdump -ni eth0 udp port 4789 or udp port 8472 or ip proto 4\nkubectl -n calico-system get pod -o wide", fix: "Mở cổng/giao thức tương ứng giữa các node (security group trên cloud)." },
  { c: "pod", m: "calico/node is not ready: BIRD is not ready: BGP not established with 10.0.0.12", s: "Pod calico-node 0/1 Ready.", why: "Phiên BGP giữa hai node không lên: TCP 179 bị chặn hoặc Calico tự chọn sai địa chỉ IP của node.",
    chk: "kubectl -n calico-system logs ds/calico-node -c calico-node | grep -i bgp | tail", fix: "Mở TCP 179; đặt nodeAddressAutodetectionV4 (ví dụ interface: eth1) trong Installation." },
  { c: "pod", m: "Request nhỏ chạy, response lớn (hoặc TLS handshake) treo", s: "curl tải trang nhỏ được, file lớn đứng im.", why: "MTU của Pod lớn hơn đường đi thật trừ phần bọc overlay: gói lớn bị rớt.",
    chk: "kubectl exec web -- cat /sys/class/net/eth0/mtu\nip link show   # trên node", fix: "Đặt MTU của CNI = MTU mạng node − overhead (VXLAN 50, IPIP 20, WireGuard 60)." },
  { c: "pod", m: "Kết nối timeout sau khi áp NetworkPolicy", s: "Timeout (gói bị bỏ), không phải refused.", why: "Policy default-deny chặn, hoặc selector của policy cho phép không khớp label.",
    chk: "kubectl get netpol -n <ns> -o yaml\nkubectl get pod --show-labels -n <ns>", fix: "Thêm rule ingress/egress đúng podSelector, namespaceSelector và cổng (Lab 17)." },

  { c: "svc", m: "curl: (7) Failed to connect to web port 80 after 0 ms: Connection refused", s: "Gọi Service bị từ chối ngay.", why: "Service không có endpoint (selector không khớp label Pod, Pod chưa Ready), nên kube-proxy cài rule REJECT.",
    chk: "kubectl get endpointslices -l kubernetes.io/service-name=web\nkubectl get svc web -o jsonpath='{.spec.selector}'; kubectl get pod --show-labels", fix: "Sửa selector hoặc label; kiểm readinessProbe nếu Pod chạy mà không Ready." },
  { c: "svc", m: "Service có endpoint nhưng curl ClusterIP timeout", s: "Gọi thẳng IP Pod được, qua ClusterIP thì không.", why: "kube-proxy không chạy hoặc không cài được rule trên node đó; sai targetPort thì thường là refused.",
    chk: "kubectl -n kube-system get pod -l k8s-app=kube-proxy -o wide\nkubectl -n kube-system logs ds/kube-proxy | tail\nsudo iptables -t nat -L KUBE-SERVICES -n | grep <ClusterIP>", fix: "Sửa ConfigMap kube-proxy (mode, clusterCIDR), restart DaemonSet." },

  { c: "hook", m: "Internal error occurred: failed calling webhook \"webhook.cert-manager.io\": failed to call webhook: Post \"https://cert-manager-webhook.cert-manager.svc:443/validate?timeout=10s\": dial tcp 10.96.42.7:443: connect: connection refused", s: "Tạo hoặc sửa object bị chặn hết, kể cả object không liên quan trực tiếp.", why: "Pod webhook chưa chạy hoặc không có endpoint, mà failurePolicy là Fail.",
    chk: "kubectl get validatingwebhookconfigurations,mutatingwebhookconfigurations\nkubectl -n cert-manager get pod,endpointslices", fix: "Đưa Pod webhook chạy lại. Khẩn cấp: tạm đổi failurePolicy sang Ignore hoặc xóa webhook configuration (nhớ khôi phục)." },
  { c: "hook", m: "failed calling webhook … x509: certificate signed by unknown authority", s: "Webhook chạy nhưng apiserver không tin nó.", why: "caBundle trong webhook configuration không khớp CA đã ký cert của webhook (cert xoay vòng mà caBundle không cập nhật).",
    chk: "kubectl get validatingwebhookconfiguration <tên> -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d | openssl x509 -noout -subject -enddate", fix: "Cập nhật caBundle (cert-manager cainjector làm tự động qua annotation cert-manager.io/inject-ca-from)." },
  { c: "hook", m: "error: Metrics API not available", s: "kubectl top lỗi; HPA báo unable to get metrics.", why: "APIService v1beta1.metrics.k8s.io không Available.",
    chk: "kubectl get apiservice v1beta1.metrics.k8s.io\nkubectl -n kube-system logs deploy/metrics-server | tail", fix: "Sửa metrics-server (thường do cert kubelet, xem lỗi kết nối ⑥)." },
  { c: "hook", m: "Namespace đứng Terminating mãi", s: "kubectl delete ns treo; status có điều kiện NamespaceDeletionDiscoveryFailure.", why: "Một APIService không Available nên namespace controller không liệt kê hết được tài nguyên để xóa.",
    chk: "kubectl get ns <ns> -o jsonpath='{.status.conditions}'\nkubectl get apiservice | grep False", fix: "Sửa hoặc xóa APIService hỏng; namespace sẽ tự xóa xong." },

  { c: "edge", m: "404 Not Found từ Gateway/Ingress controller", s: "Trả lời đến từ controller, không từ ứng dụng.", why: "Không route nào khớp host/path, hoặc HTTPRoute chưa được Gateway nhận.",
    chk: "kubectl get httproute web -o jsonpath='{.status.parents[*].conditions}'\nkubectl describe ingress web", fix: "Sửa hostnames/path; kiểm parentRefs, allowedRoutes của listener; Ingress phải có ingressClassName đúng." },
  { c: "edge", m: "503 Service Unavailable / no healthy upstream", s: "Route khớp nhưng backend không có Pod.", why: "Service backend không có endpoint, hoặc backendRef sai tên/cổng, hoặc thiếu ReferenceGrant khi khác namespace.",
    chk: "kubectl get endpointslices -l kubernetes.io/service-name=<svc>\nkubectl get httproute web -o yaml | grep -A5 ResolvedRefs", fix: "Sửa backendRef, thêm ReferenceGrant, kiểm readiness của Pod." },
  { c: "edge", m: "Trình duyệt báo chứng chỉ sai: \"Kubernetes Ingress Controller Fake Certificate\"", s: "HTTPS chạy nhưng cert mặc định của controller.", why: "Secret TLS không tồn tại, sai namespace, sai kiểu, hoặc host không khớp phần tls.hosts.",
    chk: "kubectl get secret shop-tls -o jsonpath='{.type}'\nopenssl s_client -connect shop.lab:443 -servername shop.lab </dev/null | openssl x509 -noout -subject", fix: "Tạo Secret kubernetes.io/tls cùng namespace với Ingress (hoặc Gateway + ReferenceGrant); khớp hosts." }
];

const WIRE_ERR_K = ["apiserver không chạy (refused :6443)", "Không tới được :6443 (timeout)", "kubeconfig mang sai CA", "Tên hoặc IP không có trong SAN", "Chứng chỉ hết hạn hoặc đồng hồ lệch", "401: xác thực thất bại", "403: RBAC không cho phép", "429: APF từ chối vì quá tải", "etcdctl sai cert hoặc endpoint", "etcd không chạy, apiserver không lên", "etcd hết dung lượng (NOSPACE)", "etcd chậm, leader đổi liên tục", "Peer cert thiếu IP trong SAN", "Mất đa số member, không có leader", "Có Deployment, không có ReplicaSet", "Pod Pending, không có event nào", "Mất leader election, tự restart", "Node NotReady", "Cert client của kubelet hết hạn", "kubelet không chạy vì swap", "logs/exec timeout tới :10250", "exec bị Forbidden (nodes/proxy)", "metrics-server không tin cert kubelet", "Plugin CRI của containerd bị tắt", "Sai socket hoặc containerd không chạy", "Chưa có CNI, node NotReady", "CNI lỗi khi tạo Pod (ContainerCreating)", "Sai tên hoặc tag image", "Registry private: thiếu imagePullSecret", "Registry dùng CA riêng", "Docker Hub giới hạn lượt kéo", "ServiceAccount thiếu quyền (403)", "Token cũ hết hạn trong ứng dụng (401)", "Không tới được CoreDNS", "Tên không tồn tại (NXDOMAIN)", "CoreDNS crash vì vòng lặp DNS", "Khác node thì không gọi được nhau", "Calico BGP không lên", "MTU sai: gói lớn bị treo", "NetworkPolicy chặn (timeout)", "Service không có endpoint (refused)", "ClusterIP timeout: kube-proxy hỏng", "Webhook chết chặn mọi lệnh tạo", "Webhook sai caBundle", "Metrics API không có", "Namespace kẹt Terminating", "404 từ Gateway hoặc Ingress", "503: route không có backend", "Sai cert TLS (Fake Certificate)"];
WIRE_ERRS.forEach((e, i) => { e.k = WIRE_ERR_K[i]; });

const WIRE_LADDER = [
  ["DNS", "Tên có ra IP không?", "nslookup web.dev / dig", "NXDOMAIN, timed out"],
  ["Định tuyến + TCP", "Mở được kết nối tới IP:cổng không?", "nc -vz IP PORT / curl -v", "refused (không ai nghe, không endpoint), timeout (bị chặn, mất gói)"],
  ["TLS", "Bắt tay xong không, cert có hợp lệ?", "openssl s_client -connect IP:PORT -servername TÊN", "unknown authority, not valid for, expired"],
  ["Xác thực", "Server có biết bạn là ai không?", "kubectl auth whoami", "401 Unauthorized"],
  ["Phân quyền", "Bạn có được làm việc đó không?", "kubectl auth can-i VERB RESOURCE --as …", "403 Forbidden"],
  ["Admission", "Có webhook hay chính sách nào chặn không?", "kubectl apply --dry-run=server", "admission webhook denied, failed calling webhook, violates PodSecurity"],
  ["Ứng dụng", "Ứng dụng có trả lời đúng không?", "kubectl logs, curl -v tới IP Pod", "5xx, lỗi trong log"]
];

const WIRE_OBS_COMP = [
  ["kube-apiserver", "https://:6443/metrics, /livez, /readyz?verbose", "crictl logs, /var/log/pods/kube-system_kube-apiserver-*", "apiserver_request_total{code}, apiserver_request_duration_seconds, apiserver_flowcontrol_rejected_requests_total, apiserver_admission_webhook_admission_duration_seconds, apiserver_client_certificate_expiration_seconds"],
  ["etcd", "http://127.0.0.1:2381/metrics, /health", "crictl logs (Pod etcd)", "etcd_server_has_leader, etcd_server_leader_changes_seen_total, etcd_disk_wal_fsync_duration_seconds, etcd_disk_backend_commit_duration_seconds, etcd_mvcc_db_total_size_in_bytes, etcd_network_peer_round_trip_time_seconds"],
  ["controller-manager", "https://127.0.0.1:10257/metrics, /healthz", "crictl logs", "workqueue_depth{name}, workqueue_retries_total, leader_election_master_status"],
  ["scheduler", "https://127.0.0.1:10259/metrics, /healthz", "crictl logs", "scheduler_pending_pods{queue}, scheduler_schedule_attempts_total{result}, scheduler_scheduling_attempt_duration_seconds"],
  ["kubelet", "https://:10250/metrics, /metrics/cadvisor, /metrics/resource, /metrics/probes; http://127.0.0.1:10248/healthz", "journalctl -u kubelet", "kubelet_running_pods, kubelet_pleg_relist_duration_seconds, kubelet_runtime_operations_errors_total, kubelet_certificate_manager_client_ttl_seconds, kubelet_volume_stats_available_bytes"],
  ["containerd", "crictl info, crictl stats", "journalctl -u containerd", "(qua kubelet) kubelet_runtime_operations_duration_seconds{operation_type}"],
  ["kube-proxy", "http://127.0.0.1:10249/metrics, :10256/healthz", "kubectl -n kube-system logs ds/kube-proxy", "kubeproxy_sync_proxy_rules_duration_seconds, kubeproxy_sync_proxy_rules_last_timestamp_seconds"],
  ["CoreDNS", ":9153/metrics, :8080/health, :8181/ready", "kubectl -n kube-system logs -l k8s-app=kube-dns (bật plugin log để ghi từng query)", "coredns_dns_requests_total, coredns_dns_responses_total{rcode}, coredns_dns_request_duration_seconds, coredns_forward_requests_total"],
  ["Mạng node", "node_exporter :9100", "dmesg, conntrack -S", "node_nf_conntrack_entries / node_nf_conntrack_entries_limit, node_network_receive_drop_total"]
];

const WIRE_ALERTS = [
  ["Tỉ lệ lỗi 5xx của apiserver", "sum(rate(apiserver_request_total{code=~\"5..\"}[5m])) / sum(rate(apiserver_request_total[5m]))", "> 1–3%"],
  ["Độ trễ p99 của apiserver (bỏ watch)", "histogram_quantile(0.99, sum by (le, verb) (rate(apiserver_request_duration_seconds_bucket{verb!~\"WATCH|CONNECT\"}[5m])))", "> 1s"],
  ["etcd mất leader", "max(etcd_server_has_leader) == 0", "bất kỳ"],
  ["etcd đổi leader liên tục", "increase(etcd_server_leader_changes_seen_total[1h])", "> 3"],
  ["etcd fsync WAL chậm", "histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m]))", "> 0.01 (10ms)"],
  ["Cert client sắp hết hạn", "histogram_quantile(0.01, sum by (le) (rate(apiserver_client_certificate_expiration_seconds_bucket[5m])))", "< 7 ngày (604800)"],
  ["Cert kubelet sắp hết hạn", "kubelet_certificate_manager_client_ttl_seconds", "< 604800"],
  ["Webhook chậm", "histogram_quantile(0.99, sum by (le, name) (rate(apiserver_admission_webhook_admission_duration_seconds_bucket[5m])))", "> 1s"],
  ["Pod không xếp lịch được", "sum(scheduler_pending_pods{queue=\"unschedulable\"})", "> 0 trong 15 phút"],
  ["CoreDNS SERVFAIL", "sum(rate(coredns_dns_responses_total{rcode=\"SERVFAIL\"}[5m]))", "> 0 kéo dài"],
  ["Bảng conntrack sắp đầy", "node_nf_conntrack_entries / node_nf_conntrack_entries_limit", "> 0.8"],
  ["kube-proxy không đồng bộ rule", "time() - kubeproxy_sync_proxy_rules_last_timestamp_seconds", "> 300"]
];

let errConn = "all", errQ = "";
function wireErrHTML() {
  const conns = WIRE_CONNS.filter(c => WIRE_ERRS.some(e => e.c === c.id));
  let h = '<div class="panel col"><h4>Đọc lỗi là biết tầng nào hỏng</h4><p class="hint" style="margin:0">Đi từ tầng 1 lên, dừng ở tầng đầu tiên hỏng.</p><ol class="ladder" id="wLadder">' +
    WIRE_LADDER.map((r, i) => '<li id="wLad' + i + '" title="' + kEsc(r[1] + " · " + r[2]) + '"><span class="lv">' + (i + 1) + '</span><b>' + kEsc(r[0]) + '</b><span class="sig">' + kEsc(r[3]) + "</span></li>").join("") +
    '</ol><div class="controls"><button class="btn" type="button" id="wLadPlay">▶ Đi qua từng tầng</button></div>' + wDet("Lệnh kiểm tra từng tầng", '<div class="tbl"><table><tbody>' + WIRE_LADDER.map((r, i) => "<tr><td>" + (i + 1) + "</td><td><b>" + kEsc(r[0]) + "</b><br><span class=\"small muted\">" + kEsc(r[1]) + "</span></td><td><code>" + kEsc(r[2]) + "</code></td></tr>").join("") + "</tbody></table></div>") + "</div>";
  h += '<div class="panel col"><h4>49 lỗi hay gặp</h4><div class="formrow"><input type="search" id="errQ" placeholder="Dán thông báo lỗi hoặc gõ: x509, refused, 403, NotReady…" value="' + kEsc(errQ) + '" style="flex:1;min-width:220px" aria-label="Tìm lỗi"></div>' +
    '<div class="chips" id="errChips"><button type="button" data-ec="all" aria-pressed="' + (errConn === "all") + '">Tất cả · ' + WIRE_ERRS.length + "</button>" + conns.map(c => '<button type="button" data-ec="' + c.id + '" aria-pressed="' + (errConn === c.id) + '" title="' + kEsc(c.t) + '">' + W_CIRC[c.n - 1] + " " + kEsc(c.t.split(" (")[0].replace("kube-apiserver", "apiserver").split(",")[0]) + "</button>").join("") + '</div><div id="errList"></div></div>';
  return h;
}
function wireErrList() {
  const q = errQ.trim().toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 1);
  const list = WIRE_ERRS.filter(e => (errConn === "all" || e.c === errConn) && (!words.length || words.every(w => (e.k + " " + e.m + " " + e.s + " " + e.why + " " + e.fix).toLowerCase().includes(w)) || (q.length > 12 && (e.m.toLowerCase().includes(q) || q.includes(e.m.toLowerCase().slice(0, 30))))));
  const box = $("#errList"); if (!box) return;
  box.innerHTML = list.length ? list.map((e, i) => {
    const c = WIRE_CONNS.find(x => x.id === e.c);
    return '<details class="bp err"' + (list.length === 1 || (i === 0 && q) ? " open" : "") + '><summary><span class="pill cp">' + W_CIRC[c.n - 1] + '</span><span>' + kEsc(e.k) + '</span></summary><div class="body">' +
      '<code class="em">' + kEsc(e.m) + '</code><p style="margin:0"><b>Vì sao:</b> ' + kEsc(e.why) + "</p>" +
      '<div class="k" style="font:600 11px var(--f-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Kiểm tra</div>' + wCode(e.chk) +
      '<div class="k" style="font:600 11px var(--f-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--node)">Khắc phục</div>' + wCode(e.fix) +
      '<p class="small"><button type="button" class="linkbtn" data-conn="' + c.id + '">Xem kết nối ' + W_CIRC[c.n - 1] + " " + kEsc(c.t) + "</button></p></div></details>";
  }).join("") : '<p class="muted">Không có lỗi khớp. Thử từ khóa ngắn hơn (x509, refused, timeout, 403).</p>';
  wireCopy();
}
async function wireLadderPlay() {
  const items = $$("#wLadder li"); items.forEach(li => li.classList.remove("ok", "cur"));
  for (let i = 0; i < items.length; i++) { if (!items[i].isConnected) return; items[i].classList.add("cur"); await sleep(700); items[i].classList.remove("cur"); items[i].classList.add("ok"); }
}

let obsComp = 0;
function obsCompHTML() {
  const r = WIRE_OBS_COMP[obsComp];
  return '<div class="obs-card"><div><span>Sức khỏe, metric</span><code>' + kEsc(r[1]) + '</code></div><div><span>Log</span>' + kEsc(r[2]) + '</div><div><span>Metric nên theo dõi</span>' + r[3].split(", ").map(m => "<code>" + kEsc(m) + "</code>").join(" ") + "</div></div>";
}
function wireObsHTML() {
  let h = '<div class="panel col">' + wTl(["<b>Metrics</b> cho biết có vấn đề, <b>logs và events</b> cho biết vì sao.", "Mỗi thành phần có <code>/metrics</code>, <code>/healthz</code> hoặc <code>/readyz</code> riêng.", "<b>Audit log</b> trả lời: ai đã làm gì, lúc nào."]) + "</div>";
  h += '<div class="sig6">' + [
    ["Metrics", "Con số theo thời gian", "kubectl top pod -A"], ["Logs", "Dòng log của tiến trình", "kubectl logs web --previous"], ["Events", "Chuyện vừa xảy ra, giữ 1 giờ", "kubectl events --types=Warning"],
    ["Audit", "Ai làm gì, lúc nào", "--audit-log-path"], ["Traces", "Request chậm ở đâu", "--tracing-config-file"], ["Mạng", "Gói tin, conntrack, NAT", "kubectl debug node/node01"]
  ].map(c => '<div class="sg"><b>' + c[0] + "</b><span>" + kEsc(c[1]) + "</span><code>" + kEsc(c[2]) + "</code></div>").join("") + "</div>";
  h += '<div class="panel col"><h4>Mỗi thành phần xem ở đâu</h4><div class="chips" id="obsChips">' + WIRE_OBS_COMP.map((r, i) => '<button type="button" data-obs="' + i + '" aria-pressed="' + (i === obsComp) + '">' + kEsc(r[0]) + "</button>").join("") + '</div><div id="obsCard">' + obsCompHTML() + "</div></div>";
  h += '<div class="panel col">' + wDet("Lệnh xem nhanh (không cần Prometheus)", W_OBS_CMD1) + wDet("Nhìn vào kết nối mạng", W_OBS_CMD2) +
    wDet("12 cảnh báo nên có (PromQL)", '<div class="tbl"><table><thead><tr><th>Cảnh báo</th><th>Biểu thức</th><th>Ngưỡng</th></tr></thead><tbody>' + WIRE_ALERTS.map(r => "<tr><td><b>" + kEsc(r[0]) + '</b></td><td class="small"><code>' + kEsc(r[1]) + "</code></td><td>" + kEsc(r[2]) + "</td></tr>").join("") + "</tbody></table></div>") +
    wDet("Bật audit log", W_OBS_AUDIT1) + wDet("Đọc audit log: ai đã xóa Deployment?", W_OBS_AUDIT2) + "</div>";
  return h;
}
const W_OBS_CMD1 = wCodeLater(`# apiserver và các thành phần nó phụ thuộc
kubectl get --raw '/readyz?verbose'
kubectl get --raw /metrics | grep -E '^apiserver_request_total' | sort -t' ' -k2 -nr | head
# metric của kubelet và cAdvisor qua apiserver proxy
kubectl get --raw /api/v1/nodes/node01/proxy/metrics/resource | head
kubectl get --raw /api/v1/nodes/node01/proxy/stats/summary | head -40
# etcd (trên control plane)
curl -s http://127.0.0.1:2381/metrics | grep -E 'etcd_server_has_leader|leader_changes'
# Event và log
kubectl events -A --types=Warning
kubectl logs -n kube-system -l component=kube-apiserver --tail=50
kubectl logs deploy/web --all-containers --prefix --since=10m
sudo crictl logs <container-id>          # khi apiserver chết, kubectl không dùng được`);
const W_OBS_CMD2 = wCodeLater(`# shell gỡ lỗi trên node, filesystem của node ở /host
kubectl debug node/node01 -it --image=busybox:1.36
# container gỡ lỗi chung namespace với container nginx của Pod
kubectl debug -it web --image=busybox:1.36 --target=nginx
# tcpdump trong network namespace của Pod (trên node)
PID=$(sudo crictl inspect $(sudo crictl ps --name nginx -q) | grep -m1 '"pid"' | tr -dc 0-9)
sudo nsenter -t $PID -n tcpdump -ni eth0 port 80
# bảng NAT và kết nối đang theo dõi
sudo conntrack -L -d 10.96.120.15
sudo conntrack -S                       # insert_failed, drop tăng = conntrack đầy
# Cilium: xem gói bị policy chặn
hubble observe --verdict DROPPED --namespace dev`);
const W_OBS_AUDIT1 = wCodeLater(`# /etc/kubernetes/audit/policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
omitStages: ["RequestReceived"]
rules:
  - level: None                      # bỏ nhiễu: health check, watch của hệ thống
    nonResourceURLs: ["/healthz*", "/livez*", "/readyz*"]
  - level: Metadata                  # Secret: chỉ ghi ai, khi nào; KHÔNG ghi nội dung
    resources: [{group: "", resources: ["secrets", "configmaps"]}]
  - level: RequestResponse           # thay đổi workload: ghi cả object
    verbs: ["create", "update", "patch", "delete"]
    resources: [{group: "apps"}, {group: "", resources: ["pods", "services"]}]
  - level: Metadata                  # còn lại

# kube-apiserver.yaml
#   - --audit-policy-file=/etc/kubernetes/audit/policy.yaml
#   - --audit-log-path=/var/log/kubernetes/audit/audit.log
#   - --audit-log-maxage=7
#   - --audit-log-maxbackup=3
#   - --audit-log-maxsize=100
# + volumeMounts/volumes hostPath cho cả hai thư mục`);
const W_OBS_AUDIT2 = wCodeLater(`sudo tail -1 /var/log/kubernetes/audit/audit.log | jq '{user: .user.username, verb, uri: .requestURI, code: .responseStatus.code, ip: .sourceIPs[0]}'
{
  "user": "jane",
  "verb": "delete",
  "uri": "/apis/apps/v1/namespaces/dev/deployments/web",
  "code": 200,
  "ip": "192.168.1.20"
}
# ai đã xóa Deployment web?
sudo jq -c 'select(.verb=="delete" and (.requestURI|test("deployments/web")))
  | [.requestReceivedTimestamp, .user.username]' /var/log/kubernetes/audit/audit.log`) + '<p class="small muted">Để Secret ở level Metadata: level Request trở lên sẽ ghi nội dung Secret vào file log.</p>';
