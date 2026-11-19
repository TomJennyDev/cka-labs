/* ---------- 4.1 Hành trình một request: từ trình duyệt tới container và quay về ----------
   Mọi IP, port, rule, log và gói tin trong file này bắt thật ngày 19/11/2026 trên k3s v1.34:
   3 node chạy trong Docker (controlplane 172.18.0.2, node01 172.18.0.3, node02 172.18.0.4), flannel VXLAN,
   kube-proxy chế độ iptables, NetworkPolicy của kube-router, Traefik 3.7.4 làm Ingress controller.
   Manifest: src/reqflow/app.yaml. Bản bắt gói gốc: src/reqflow/capture.txt (bắt bằng tools/sniff.py). */

/* hộp trên sơ đồ: id → [x, y, w, h, class, tên, dòng phụ] */
const RF_BOX = {
  user: [20, 20, 150, 58, "sv-box", "Người dùng · curl", "172.18.0.1"],
  dns: [190, 20, 150, 58, "sv-box", "DNS công khai", "shop.example.com → ?"],
  lb: [360, 20, 170, 58, "sv-box", "Load balancer", "lab: <pending>"],
  coredns: [720, 34, 240, 48, "sv-data", "CoreDNS (Pod)", "10.42.0.3:53"],
  svcT: [20, 102, 230, 44, "sv-cp", "svc traefik · LoadBalancer", "nodePort 30443 · 10.43.212.89"],
  svcW: [262, 102, 230, 44, "sv-cp", "svc web", "10.43.225.42:80 → http"],
  svcC: [504, 102, 230, 44, "sv-cp", "svc catalog", "10.43.224.31:80 → http"],
  svcD: [746, 102, 234, 44, "sv-cp", "svc kube-dns", "10.43.0.10:53"],
  web1: [40, 196, 200, 66, "an-c", "web …8l48w", "10.42.2.2:8080"],
  cat: [270, 196, 200, 66, "an-c", "catalog", "10.42.2.3:9000"],
  trf: [530, 196, 200, 66, "an-c", "traefik (Ingress)", "10.42.1.4:8443"],
  web2: [760, 196, 200, 66, "an-c", "web …zzmlz", "10.42.1.3:8080"],
  c1: [40, 300, 430, 40, "an-vol", "cni0 10.42.2.1 · veth của từng Pod", ""],
  c2: [530, 300, 430, 40, "an-vol", "cni0 10.42.1.1 · veth của từng Pod", ""],
  f1: [40, 370, 430, 48, "sv-pkt", "netfilter: kube-proxy (DNAT/SNAT)", "NetworkPolicy (kube-router) · conntrack"],
  f2: [530, 370, 430, 48, "sv-pkt", "netfilter: kube-proxy (DNAT/SNAT)", "NetworkPolicy (kube-router) · conntrack"],
  e1: [40, 450, 200, 44, "an-ext", "eth0", "172.18.0.3"],
  v1: [260, 450, 210, 44, "an-ext", "flannel.1 (VTEP)", "VXLAN UDP 8472 · MTU 1450"],
  e2: [530, 450, 200, 44, "an-ext", "eth0", "172.18.0.4"],
  v2: [750, 450, 210, 44, "an-ext", "flannel.1 (VTEP)", "VXLAN UDP 8472 · MTU 1450"]
};
/* đường đi của gói (tọa độ SVG) */
const RF_P = {
  dnsQ: [[170, 40], [190, 40]], dnsA: [[190, 60], [170, 60]], toLb: [[170, 49], [190, 49], [340, 49], [360, 49]],
  in: [[95, 78], [95, 92], [10, 92], [10, 472], [40, 472]],
  nat: [[140, 450], [140, 418]],
  vx: [[300, 418], [365, 450], [365, 494], [365, 530], [855, 530], [855, 494]],
  up2: [[855, 450], [745, 418], [745, 370], [745, 340], [630, 300], [630, 262]],
  t2w: [[630, 262], [630, 320], [700, 394], [855, 450], [855, 530], [365, 530], [365, 494], [300, 418], [140, 340], [140, 262]],
  dnsApp: [[140, 262], [140, 320], [220, 394], [365, 450], [365, 530], [992, 530], [992, 58], [960, 58]],
  cat: [[140, 262], [140, 320], [255, 394], [370, 320], [370, 262]],
  out: [[630, 262], [630, 320], [745, 394], [855, 450], [855, 530], [365, 530], [365, 494], [300, 418], [140, 450], [40, 472], [10, 472], [10, 92], [95, 92], [95, 78]]
};
const rfRev = p => p.slice().reverse();

const RF_STEPS = [
  { t: "Tra tên miền", on: ["user", "dns"], pk: [[RF_P.dnsQ, "blue"], [RF_P.dnsA, "blue"]],
    hdr: "shop.example.com → ?   (DNS công khai, nằm ngoài cluster)",
    d: "Trình duyệt hỏi DNS công khai IP của <code>shop.example.com</code>. Bản ghi phải trỏ về IP của <b>load balancer</b>, không phải IP Pod hay ClusterIP: các IP đó không đi ra được ngoài cluster. Lab không có DNS công khai nên curl được ép tên tới IP của node01 bằng <code>--resolve</code>.",
    port: "Chưa có port Kubernetes nào. Trình duyệt sẽ gọi 443.",
    ev: `$ curl https://shop.example.com/
curl: (6) Could not resolve host: shop.example.com

# lab: ép tên về IP node01, gọi cổng nodePort
$ curl --cacert tls.crt --resolve shop.example.com:30443:172.18.0.3 https://shop.example.com:30443/`,
    c: "dig +short shop.example.com\nk get svc -n ingress traefik" },
  { t: "Load balancer chọn một node", on: ["user", "lb", "svcT"], pk: [[RF_P.toLb, "blue"]],
    hdr: "trên cloud: client → IP-LB:443  →  IP-node:30443",
    d: "Service <code>type: LoadBalancer</code> là NodePort cộng thêm một load balancer bên ngoài do cloud-controller-manager (hoặc MetalLB) tạo. LB nghe 443 rồi chuyển tới <b>nodePort 30443</b> trên các node. Lab không có LB controller nên <code>EXTERNAL-IP</code> đứng <code>&lt;pending&gt;</code> mãi và cột ADDRESS của Ingress trống. nodePort vẫn được cấp và chạy, nên bước sau gọi thẳng nodePort.",
    port: "LB: 443 → nodePort 30443. Cột PORT(S) đọc là <code>port:nodePort</code>.",
    ev: `$ k get svc -n ingress traefik
NAME      TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)                      AGE
traefik   LoadBalancer   10.43.212.89   <pending>     80:30080/TCP,443:30443/TCP   2m45s

$ k get ing -n shop
NAME   CLASS     HOSTS              ADDRESS   PORTS     AGE
shop   traefik   shop.example.com             80, 443   2m45s`,
    c: "k get svc -A --field-selector spec.type=LoadBalancer\nk describe svc -n ingress traefik" },
  { t: "Tới node01 ở cổng nodePort", on: ["user", "e1"], pk: [[RF_P.in, ""]],
    hdr: "172.18.0.1:47992 → 172.18.0.3:30443   TCP SYN",
    d: "Gói đầu tiên của kết nối TCP tới eth0 của node01. node01 <b>không chạy Pod Traefik nào</b>: nodePort mở trên mọi node nên gọi node nào cũng được. Cũng không có tiến trình nào nghe cổng 30443. Thứ nhận gói là rule netfilter do kube-proxy cài.",
    port: "nodePort 30443 (<code>spec.ports[].nodePort</code> của Service traefik).",
    ev: `# bắt trên node01
 0.0ms node01 eth0  172.18.0.1:47992 → 172.18.0.3:30443 TCP SYN
 0.1ms node01 eth0  172.18.0.3:30443 → 172.18.0.1:47992 TCP SYN-ACK`,
    c: "k get svc -n ingress traefik -o jsonpath='{.spec.ports}'\nsudo iptables-save -t nat | grep 30443" },
  { t: "kube-proxy đổi đích và đổi nguồn", on: ["e1", "f1", "svcT"], pk: [[RF_P.nat, ""]],
    hdr: "trước NAT: 172.18.0.1:47992 → 172.18.0.3:30443\nsau NAT:   10.42.2.0:6512  → 10.42.1.4:8443",
    d: "Chuỗi rule: <code>KUBE-NODEPORTS</code> khớp cổng 30443 → <code>KUBE-EXT</code> đánh dấu cần SNAT (<code>externalTrafficPolicy: Cluster</code>) → <code>KUBE-SVC</code> chọn endpoint → <code>KUBE-SEP</code> <b>DNAT</b> tới IP Pod Traefik 10.42.1.4:8443. Pod nằm ở node khác, nên POSTROUTING <b>MASQUERADE</b> đổi nguồn thành 10.42.2.0 (IP flannel.1 của node01) để gói trả lời quay về đúng node01. conntrack ghi nhớ cả hai chiều.",
    port: "nodePort 30443 đi thẳng tới targetPort <code>websecure</code> = 8443. <b>port 443 của Service không xuất hiện</b>: nó chỉ dùng khi gọi ClusterIP 10.43.212.89:443 từ trong cluster.",
    ev: `$ sudo iptables-save -t nat | grep 'ingress/traefik:https'
-A KUBE-NODEPORTS -p tcp -m comment --comment "ingress/traefik:https" -m tcp --dport 30443 -j KUBE-EXT-FVSPRSLCNRM6U4HW
-A KUBE-EXT-FVSPRSLCNRM6U4HW -m comment --comment "masquerade traffic for ingress/traefik:https external destinations" -j KUBE-MARK-MASQ
-A KUBE-SVC-FVSPRSLCNRM6U4HW -m comment --comment "ingress/traefik:https -> 10.42.1.4:8443" -j KUBE-SEP-LHIY2I7MDCVVXCZD
-A KUBE-SEP-LHIY2I7MDCVVXCZD -p tcp -m comment --comment "ingress/traefik:https" -m tcp -j DNAT --to-destination 10.42.1.4:8443
-A KUBE-POSTROUTING -m comment --comment "kubernetes service traffic requiring SNAT" -j MASQUERADE --random-fully

# gói ngay sau NAT (flannel.1 của node01)
 0.1ms node01 flannel.1  10.42.2.0:6512 → 10.42.1.4:8443 TCP SYN

# conntrack của một request cùng đợt: chiều đi | chiều về đã đảo
$ sudo conntrack -L -p tcp --dport 30443
tcp 6 90 TIME_WAIT src=172.18.0.1 dst=172.18.0.3 sport=48950 dport=30443 src=10.42.1.4 dst=10.42.2.0 sport=8443 dport=14061 [ASSURED]`,
    c: "sudo iptables-save -t nat | grep 'ingress/traefik:https'\nsudo conntrack -L -p tcp --dport 30443" },
  { t: "Bọc VXLAN sang node02", on: ["f1", "v1", "v2"], pk: [[RF_P.vx, "fmt"]],
    hdr: "[ngoài 172.18.0.3 → 172.18.0.4 UDP 8472] [trong 10.42.2.0:6512 → 10.42.1.4:8443]",
    d: "Bảng route của node01 nói dải 10.42.1.0/24 nằm sau <code>flannel.1</code>. Thiết bị VXLAN bọc nguyên gói vào UDP 8472, IP ngoài là IP hai node, nên mạng giữa hai node chỉ thấy UDP. Lớp bọc tốn 50 byte, vì vậy MTU của flannel.1 là 1450.",
    port: "Port của ứng dụng không đổi. 8472 là port của VXLAN (flannel), không liên quan Service.",
    ev: `$ ip route          # trên node01
10.42.0.0/24 via 10.42.0.0 dev flannel.1 onlink
10.42.1.0/24 via 10.42.1.0 dev flannel.1 onlink
10.42.2.0/24 dev cni0 proto kernel scope link src 10.42.2.1

$ ip -d link show flannel.1
3: flannel.1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 ...
    vxlan id 1 local 172.18.0.3 dev eth0 srcport 0 0 dstport 8472 ...

 0.1ms node01 eth0  [VXLAN 172.18.0.3 → 172.18.0.4 UDP 8472] bên trong: 10.42.2.0:6512 → 10.42.1.4:8443 TCP SYN
 2.4ms node02 eth0  [VXLAN 172.18.0.3 → 172.18.0.4 UDP 8472] bên trong: 10.42.2.0:6512 → 10.42.1.4:8443 TCP SYN`,
    c: "ip route\nip -d link show flannel.1" },
  { t: "Traefik bắt tay TLS", on: ["v2", "f2", "c2", "trf"], pk: [[RF_P.up2, ""]],
    hdr: "10.42.2.0:6512 → 10.42.1.4:8443   TLS ClientHello SNI=shop.example.com",
    d: "node02 mở gói VXLAN, đưa qua cni0 và veth vào eth0 của Pod Traefik. Nội dung là TLS: curl gửi tên <b>SNI</b> shop.example.com ngay trong ClientHello. Traefik dùng SNI để chọn chứng chỉ trong Secret <code>shop-tls</code> (khai ở <code>spec.tls</code> của Ingress) và <b>kết thúc TLS tại đây</b>. Từ Traefik vào trong là HTTP thường.",
    port: "targetPort <code>websecure</code> → containerPort 8443: port mà tiến trình Traefik thật sự nghe (<code>--entryPoints.websecure.address=:8443</code>).",
    ev: `# bắt trên node02
 2.6ms node02 cni0          10.42.2.0:6512 → 10.42.1.4:8443 TCP SYN
 2.9ms node02 veth3d86be91  10.42.2.0:6512 → 10.42.1.4:8443 TCP TLS ClientHello SNI=shop.example.com
 3.8ms node02 veth3d86be91  10.42.1.4:8443 → 10.42.2.0:6512 TCP TLS ServerHello

$ curl -v --cacert tls.crt --resolve shop.example.com:30443:172.18.0.3 https://shop.example.com:30443/
* SSL connection using TLSv1.3 / TLS_AES_128_GCM_SHA256 / X25519 / RSASSA-PSS
* ALPN: server accepted h2
*  subject: CN=shop.example.com
*  subjectAltName: host "shop.example.com" matched cert's "shop.example.com"
*  SSL certificate verify ok.`,
    c: "k get ing -n shop shop -o jsonpath='{.spec.tls}'\nopenssl s_client -connect 172.18.0.3:30443 -servername shop.example.com </dev/null | head" },
  { t: "Khớp Ingress, chọn một Pod", on: ["trf", "svcW"], pk: [],
    hdr: "GET /  Host: shop.example.com:30443  →  router websecure-shop-…  →  http://10.42.2.2:8080",
    d: "Traefik đã đọc sẵn Ingress (class <code>traefik</code>, host shop.example.com, path <code>/</code> Prefix → <code>web:http</code>) và <b>EndpointSlice</b> của Service web. Nó chọn một IP Pod trong EndpointSlice và <b>gọi thẳng IP Pod</b>. ClusterIP 10.43.225.42 của Service web không được dùng (hộp svc web không sáng ở bước sau): Service ở đây chỉ để tra danh sách Pod và targetPort. ingress-nginx cũng làm như vậy. Host còn <code>:30443</code> vì lab gọi nodePort; Ingress so host bỏ qua phần port.",
    port: "Backend <code>port.name: http</code> → Service web port 80 tên http → targetPort <code>http</code> → containerPort tên http = <b>8080</b>. Số 80 không bao giờ nằm trên gói.",
    ev: `$ k get endpointslice -n shop
NAME            ADDRESSTYPE   PORTS   ENDPOINTS             AGE
catalog-txvb5   IPv4          9000    10.42.2.3             2m45s
web-vtg5n       IPv4          8080    10.42.1.3,10.42.2.2   2m45s

# access log của Traefik: cột áp chót là router, cột cuối là Pod được chọn
10.42.2.0 - - [19/Nov/2026:07:09:25 +0000] "GET / HTTP/2.0" 200 233 "-" "-" 9 "websecure-shop-shop-shop-example-com@kubernetes" "http://10.42.2.2:8080" 10ms`,
    c: "k describe ing -n shop shop\nk get endpointslice -n shop -l kubernetes.io/service-name=web" },
  { t: "Traefik gọi Pod web ở node01", on: ["trf", "c2", "v2", "v1", "f1", "web1"], pk: [[RF_P.t2w, "blue"]],
    hdr: "10.42.1.4:41498 → 10.42.2.2:8080   GET / HTTP/1.1   (kết nối TCP mới, không mã hóa)",
    d: "Đây là <b>kết nối TCP thứ hai</b>, do Traefik mở. Pod được chọn nằm ở node01 nên gói lại đi VXLAN về node01. Trước khi vào Pod, NetworkPolicy <code>web-from-ingress</code> (kube-router cài trên node01) cho qua vì nguồn thuộc namespace <code>ingress</code> và đích là port 8080. Không có NAT: nguồn là IP Pod Traefik.",
    port: "targetPort 8080: port httpd trong container đang nghe.",
    ev: ` 5.7ms node01 eth0          [VXLAN 172.18.0.4 → 172.18.0.3 UDP 8472] bên trong: 10.42.1.4:41498 → 10.42.2.2:8080 TCP SYN
 5.8ms node01 vethcb194c05  10.42.1.4:41498 → 10.42.2.2:8080 TCP SYN
 5.8ms node01 vethcb194c05  10.42.2.2:8080 → 10.42.1.4:41498 TCP SYN-ACK
 6.3ms node01 vethcb194c05  10.42.1.4:41498 → 10.42.2.2:8080 TCP GET / HTTP/1.1

$ k get netpol -n shop
NAME               POD-SELECTOR   AGE
catalog-from-web   app=catalog    4m56s
default-deny       <none>         5s
web-from-ingress   app=web        5s`,
    c: "k get netpol -n shop\nk describe netpol -n shop web-from-ingress" },
  { t: "Container nhận request", on: ["web1"], pk: [],
    hdr: "app thấy: REMOTE_ADDR=10.42.1.4 · X-Forwarded-For=10.42.2.0 · X-Forwarded-Proto=https",
    d: "httpd trong container nghe <code>0.0.0.0:8080</code>. Ứng dụng thấy kết nối đến từ IP của Traefik. Traefik có thêm header X-Forwarded-For, nhưng giá trị là 10.42.2.0: IP node01 sau SNAT ở bước 4, <b>không phải IP thật 172.18.0.1</b>. Muốn giữ IP thật thì dùng <code>externalTrafficPolicy: Local</code> (bảng bên dưới). Trong bản bắt gói còn thấy SYN từ 10.42.2.1 tới :8080 mỗi 2 giây: đó là readiness probe của kubelet, đi từ IP cni0 của node.",
    port: "containerPort 8080 tên <code>http</code> chỉ là khai báo. Thứ thật sự nhận gói là tiến trình đang listen 8080.",
    ev: `$ k exec -n shop deploy/web -- netstat -tln
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:8080            0.0.0.0:*               LISTEN

# phản hồi của app (CGI in lại những gì nó nhận được)
pod=web-7f797d47b8-8l48w podIP=10.42.2.2 nghe=:8080
REMOTE_ADDR=10.42.1.4 (ket noi TCP den tu dau)
X-Forwarded-For=10.42.2.0
Host=shop.example.com:30443 X-Forwarded-Proto=https`,
    c: "k exec <pod> -- netstat -tln      # hoặc ss -tlnp\nk get pod <pod> -o jsonpath='{.spec.containers[0].ports}'" },
  { t: "App hỏi DNS tên catalog", on: ["web1", "c1", "f1", "v1", "coredns", "svcD"], pk: [[RF_P.dnsApp, "blue"], [rfRev(RF_P.dnsApp), "blue"]],
    hdr: "10.42.2.2:60322 → 10.43.0.10:53  A? catalog.shop.svc.cluster.local\n(DNAT thành → 10.42.0.3:53, Pod CoreDNS ở controlplane)",
    d: "App gọi <code>http://catalog/</code>. File resolv.conf có <code>search shop.svc.cluster.local …</code> và <code>ndots:5</code>, nên tên ngắn được ghép thành <code>catalog.shop.svc.cluster.local</code> trước tiên. Gói tới ClusterIP 10.43.0.10 của kube-dns, bị DNAT thành IP Pod CoreDNS 10.42.0.3 nằm ở controlplane (đi VXLAN). Busybox hỏi cả A lẫn AAAA: AAAA không có bản ghi, A trả 10.43.224.31.",
    port: "Service kube-dns port 53 → targetPort 53 của CoreDNS (UDP).",
    ev: `$ k exec -n shop deploy/web -- cat /etc/resolv.conf
search shop.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.43.0.10
options ndots:5

 9.4ms node01 vethcb194c05  10.42.2.2:60322 → 10.43.0.10:53 UDP DNS hỏi A? catalog.shop.svc.cluster.local
 9.5ms node01 cni0          10.42.2.2:60322 → 10.42.0.3:53 UDP DNS hỏi A? catalog.shop.svc.cluster.local
 9.6ms node01 eth0          [VXLAN 172.18.0.3 → 172.18.0.2 UDP 8472] bên trong: 10.42.2.2:60322 → 10.42.0.3:53 UDP DNS hỏi A? catalog.shop.svc.cluster.local
 9.9ms node01 flannel.1     10.42.0.3:53 → 10.42.2.2:60322 UDP DNS đáp A catalog.shop.svc.cluster.local → 10.43.224.31
10.1ms node01 vethcb194c05  10.43.0.10:53 → 10.42.2.2:60322 UDP DNS đáp A catalog.shop.svc.cluster.local → 10.43.224.31

$ sudo conntrack -L -p udp --dport 53
udp 17 27 src=10.42.2.2 dst=10.43.0.10 sport=60322 dport=53 src=10.42.0.3 dst=10.42.2.2 sport=53 dport=60322`,
    c: "k exec <pod> -- cat /etc/resolv.conf\nk exec <pod> -- nslookup catalog" },
  { t: "App gọi catalog qua ClusterIP", on: ["web1", "c1", "f1", "cat", "svcC"], pk: [[RF_P.cat, "blue"]],
    hdr: "trên veth của web: 10.42.2.2:57980 → 10.43.224.31:80\nsau DNAT (cni0):   10.42.2.2:57980 → 10.42.2.3:9000",
    d: "Lần này app gọi <b>ClusterIP</b> thật, nên kube-proxy DNAT ngay khi gói rời veth vào node: trên veth của web còn thấy 10.43.224.31:80, tới cni0 đã thành 10.42.2.3:9000. Hai Pod cùng ở node01 nên không qua VXLAN. Không có SNAT vì nguồn là Pod trong cluster. NetworkPolicy <code>catalog-from-web</code> cho qua.",
    port: "port 80 của Service catalog → targetPort <code>http</code> → containerPort 9000. Chỉ khi gọi qua ClusterIP thì port của Service mới thật sự nằm trên gói.",
    ev: `10.1ms node01 vethcb194c05  10.42.2.2:57980 → 10.43.224.31:80 TCP SYN
10.1ms node01 cni0          10.42.2.2:57980 → 10.42.2.3:9000 TCP SYN
10.1ms node01 veth7eb54a72  10.42.2.3:9000 → 10.42.2.2:57980 TCP SYN-ACK
10.1ms node01 vethcb194c05  10.43.224.31:80 → 10.42.2.2:57980 TCP SYN-ACK

$ sudo iptables-save -t nat | grep 'shop/catalog:http'
-A KUBE-SERVICES -d 10.43.224.31/32 -p tcp -m comment --comment "shop/catalog:http cluster IP" -m tcp --dport 80 -j KUBE-SVC-ITBI3OHKD3FRXPDK
-A KUBE-SVC-ITBI3OHKD3FRXPDK -m comment --comment "shop/catalog:http -> 10.42.2.3:9000" -j KUBE-SEP-KZ2FWXFBDDMAJXBG
-A KUBE-SEP-KZ2FWXFBDDMAJXBG -p tcp -m comment --comment "shop/catalog:http" -m tcp -j DNAT --to-destination 10.42.2.3:9000

$ sudo conntrack -L -d 10.43.224.31
tcp 6 90 TIME_WAIT src=10.42.2.2 dst=10.43.224.31 sport=41086 dport=80 src=10.42.2.3 dst=10.42.2.2 sport=9000 dport=41086 [ASSURED]`,
    c: "k get svc,endpointslice -n shop\nsudo iptables-save -t nat | grep 'shop/catalog'" },
  { t: "Phản hồi đi ngược về người dùng", on: ["cat", "web1", "trf", "f1", "e1", "user"], pk: [[rfRev(RF_P.cat), "v2"], [rfRev(RF_P.t2w), "v2"], [RF_P.out, "v2"]],
    hdr: "về tới curl: 172.18.0.3:30443 → 172.18.0.1:47992 · HTTP/2 200 · khoảng 11 ms",
    d: "Mỗi chặng trả lời trên đúng kết nối đã mở. catalog → web: conntrack đổi nguồn 10.42.2.3:9000 về lại 10.43.224.31:80. web → Traefik: HTTP 200. Traefik mã hóa lại và gửi về node01, nơi conntrack đổi 10.42.1.4:8443 thành 172.18.0.3:30443 và 10.42.2.0 thành 172.18.0.1. Chiều về <b>không cần rule nào</b>: conntrack lo hết. Cả hành trình mất khoảng 11 ms.",
    port: "Chiều về dùng lại đúng các cặp IP:port của chiều đi, chỉ đảo nguồn và đích.",
    ev: `10.4ms node01 veth7eb54a72  10.42.2.3:9000 → 10.42.2.2:57980 TCP HTTP/1.1 200 OK
10.4ms node01 vethcb194c05  10.43.224.31:80 → 10.42.2.2:57980 TCP HTTP/1.1 200 OK
10.8ms node01 vethcb194c05  10.42.2.2:8080 → 10.42.1.4:41498 TCP HTTP/1.1 200 OK
10.8ms node01 eth0          [VXLAN 172.18.0.3 → 172.18.0.4 UDP 8472] bên trong: 10.42.2.2:8080 → 10.42.1.4:41498 TCP HTTP/1.1 200 OK
10.9ms node02 veth3d86be91  10.42.2.2:8080 → 10.42.1.4:41498 TCP HTTP/1.1 200 OK

# curl nhận
< HTTP/2 200
pod=web-7f797d47b8-8l48w podIP=10.42.2.2 nghe=:8080
catalog -> catalog catalog-7b9f8dd6d9-lbdr5: 3 san pham`,
    c: "sudo conntrack -L -p tcp --dport 30443\nsudo conntrack -L -d 10.43.224.31" }
];

/* lỗi bật được: at = bước dừng, m = chỗ đánh dấu, sev = bad (request hỏng) | warn (vẫn 200 nhưng nội dung lỗi) */
const RF_FAULTS = [
  { g: "Ngoài cluster", id: "dns", n: "Chưa có bản ghi DNS", at: 0, m: [265, 49], sev: "bad",
    out: "$ curl https://shop.example.com/\ncurl: (6) Could not resolve host: shop.example.com",
    why: "Không có bản ghi DNS, hoặc bản ghi trỏ sai IP load balancer. Lỗi xảy ra trước khi có gói nào tới cluster, nên Kubernetes không có log hay event gì.",
    c: "dig +short shop.example.com\nk get svc -n ingress traefik     # so với EXTERNAL-IP", fix: "Tạo bản ghi A (hoặc CNAME) trỏ tới EXTERNAL-IP / hostname của load balancer.", go: ["ingress", "ig_addr"] },
  { g: "Ngoài cluster", id: "lb", n: "Load balancer không cấp IP", at: 1, m: [445, 49], sev: "bad",
    out: "$ k get svc -n ingress traefik\nNAME      TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)                      AGE\ntraefik   LoadBalancer   10.43.212.89   <pending>     80:30080/TCP,443:30443/TCP   2m45s",
    why: "Không có cloud-controller-manager hay MetalLB nên không ai cấp IP cho Service LoadBalancer: EXTERNAL-IP đứng <pending> mãi, cột ADDRESS của Ingress cũng trống. nodePort vẫn chạy.",
    c: "k describe svc -n ingress traefik\nk get pod -A | grep -iE 'metallb|cloud-controller'", fix: "Cài MetalLB (on-prem) hoặc kiểm tra cloud-controller-manager; tạm thời gọi IP-node:nodePort.", go: ["ingress", "ig_addr"] },
  { g: "Node & kube-proxy", id: "nodeport", n: "Gọi sai cổng nodePort", at: 2, m: [140, 472], sev: "bad",
    out: "$ curl --resolve shop.example.com:30444:172.18.0.3 https://shop.example.com:30444/\ncurl: (7) Failed to connect to shop.example.com port 30444 after 0 ms: Couldn't connect to server",
    why: "Không có rule nào cho cổng 30444 và cũng không có tiến trình nào nghe, nên kernel của node trả RST ngay (0 ms). Nếu firewall hoặc security group chặn dải 30000–32767 thì thường thấy timeout thay vì bị từ chối ngay.",
    c: "k get svc -A | grep -E 'NodePort|LoadBalancer'\nsudo iptables-save -t nat | grep KUBE-NODEPORTS", fix: "Gọi đúng nodePort trong cột PORT(S); mở dải nodePort trên firewall.", go: ["svc", "s_proxy"] },
  { g: "Node & kube-proxy", id: "local", n: "externalTrafficPolicy: Local, vào node không có Traefik", at: 3, m: [255, 394], sev: "bad",
    out: "$ curl --resolve shop.example.com:30443:172.18.0.3 https://shop.example.com:30443/\ncurl: (28) Connection timed out after 4002 milliseconds\n\n$ sudo iptables-save | grep 'no local endpoints'\n-A KUBE-EXTERNAL-SERVICES -p tcp -m comment --comment \"ingress/traefik:https has no local endpoints\" -m addrtype --dst-type LOCAL -m tcp --dport 30443 -j DROP\n\n$ curl http://172.18.0.3:31391/      # healthCheckNodePort\n{ \"service\": { \"namespace\": \"ingress\", \"name\": \"traefik\" }, \"localEndpoints\": 0, \"serviceProxyHealthy\": true }   HTTP 503",
    why: "Với Local, node chỉ nhận traffic khi chính nó có Pod của Service. node01 không có Pod Traefik nên rule DROP: không trả lời gì, client chờ tới timeout. Cloud LB tránh được lỗi này nhờ hỏi healthCheckNodePort: node01 trả 503 (localEndpoints 0), node02 trả 200, nên LB chỉ gửi tới node02.",
    c: "k get svc -n ingress traefik -o jsonpath='{.spec.externalTrafficPolicy} {.spec.healthCheckNodePort}'\ncurl http://<IP-node>:<healthCheckNodePort>/", fix: "Đi qua LB (có health check), chạy controller dạng DaemonSet, hoặc để Cluster nếu không cần IP client.", go: ["svc", "s_proxy"] },
  { g: "Ingress controller", id: "class", n: "Sai ingressClassName", at: 5, m: [630, 229], sev: "bad",
    out: "$ curl --cacert tls.crt … https://shop.example.com:30443/\ncurl: (60) SSL certificate problem: self-signed certificate\n\n$ curl -k … https://shop.example.com:30443/     # bỏ qua kiểm chứng chỉ\n404 page not found\n\n$ k get ing -n shop\nNAME   CLASS   HOSTS              ADDRESS   PORTS     AGE\nshop   nginx   shop.example.com             80, 443   3m31s",
    why: "ingressClassName: nginx nhưng cluster chỉ có controller traefik, nên không controller nào nhận Ingress này. Traefik không có router cho host đó: nó trả chứng chỉ mặc định TRAEFIK DEFAULT CERT (curl không tin) và 404.",
    c: "k get ingressclass\nk get ing -A", fix: "Sửa spec.ingressClassName đúng tên IngressClass của controller đang chạy.", go: ["ingress", "ig_404"] },
  { g: "Ingress controller", id: "tls", n: "Secret TLS sai tên", at: 5, m: [630, 229], sev: "bad",
    out: "$ curl --cacert tls.crt … https://shop.example.com:30443/\ncurl: (60) SSL certificate problem: self-signed certificate\n\n$ curl -kv … 2>&1 | grep -E 'subject|issuer'\n*  subject: CN=TRAEFIK DEFAULT CERT\n*  issuer: CN=TRAEFIK DEFAULT CERT\n\n$ k logs -n ingress deploy/traefik\nERR Error configuring TLS error=\"secret shop/shop-tls-moi does not exist\" ingress=shop namespace=shop providerName=kubernetes",
    why: "spec.tls trỏ tới Secret không có (hoặc Secret nằm khác namespace với Ingress). Traefik vẫn phục vụ request nhưng bằng chứng chỉ mặc định, nên trình duyệt báo chứng chỉ không tin cậy.",
    c: "k get secret -n shop\nk logs -n ingress deploy/traefik | grep -i tls", fix: "Tạo Secret kubernetes.io/tls cùng namespace: k create secret tls shop-tls --cert=tls.crt --key=tls.key -n shop", go: ["ingress", "ig_tls"] },
  { g: "Ingress controller", id: "host", n: "Sai host trong Ingress", at: 6, m: [630, 229], sev: "bad",
    out: "404 page not found\n[HTTP 404, 0.006s]\n\n# access log: hai cột \"-\" cuối = không có router, không có backend\n10.42.2.0 - - [19/Nov/2026:07:10:19 +0000] \"GET / HTTP/2.0\" 404 19 \"-\" \"-\" 11 \"-\" \"-\" 0ms",
    why: "Ingress khai host shop.example.org, request đến với host shop.example.com: không router nào khớp nên 404 ngay tại controller, không gói nào đi tới Pod.",
    c: "k get ing -A -o custom-columns=NS:.metadata.namespace,NAME:.metadata.name,HOST:.spec.rules[*].host", fix: "Sửa host cho đúng (hoặc gọi đúng tên); kiểm tra cả path và pathType.", go: ["ingress", "ig_404"] },
  { g: "Ingress controller", id: "svcname", n: "Backend trỏ Service không tồn tại", at: 6, m: [630, 229], sev: "bad",
    out: "404 page not found\n[HTTP 404, 0.008s]\n\n$ k logs -n ingress deploy/traefik\nERR Cannot create service error=\"service not found\" ingress=shop namespace=shop providerName=kubernetes serviceName=webb servicePort=&ServiceBackendPort{Name:http,Number:0,}\n\n$ k describe ing -n shop shop\n  shop.example.com\n                    /   webb:http (<error: services \"webb\" not found>)",
    why: "Backend ghi webb (gõ sai), hoặc Service nằm ở namespace khác: Ingress chỉ trỏ được Service cùng namespace. Traefik bỏ luôn router nên trả 404, không phải 503.",
    c: "k describe ing -n shop shop\nk get svc -n shop", fix: "Sửa backend.service.name và port cho đúng Service cùng namespace.", go: ["ingress", "ig_404"] },
  { g: "Service & Pod", id: "selector", n: "Selector của Service sai label", at: 6, m: [377, 124], sev: "bad",
    out: "404 page not found\n[HTTP 404, 0.007s]\n\n$ k logs -n ingress deploy/traefik\nERR Skipping service: no endpoints found ingress=shop namespace=shop providerName=kubernetes serviceName=web servicePort=&ServiceBackendPort{Name:http,Number:0,}\n\n$ k get endpointslice -n shop -l kubernetes.io/service-name=web\nNAME        ADDRESSTYPE   PORTS     ENDPOINTS   AGE\nweb-vtg5n   IPv4          <unset>   <unset>     4m3s",
    why: "selector app: wbe không khớp Pod nào nên EndpointSlice rỗng. Traefik bỏ router khi Service không có endpoint, nên trả 404. Controller khác có thể trả 503 cho cùng lỗi (ví dụ ingress-nginx; không chạy thử ở đây).",
    c: "k get svc web -n shop -o jsonpath='{.spec.selector}'\nk get pod -n shop --show-labels", fix: "Sửa selector cho khớp label trong template của Pod (không phải label của Deployment).", go: ["svc", "s_noep"] },
  { g: "Service & Pod", id: "ready", n: "Mọi Pod web không Ready", at: 6, m: [630, 229], sev: "bad",
    out: "no available server\n[HTTP 503, 0.007s]\n\n# access log: có router nhưng không có backend\n10.42.2.0 - - [19/Nov/2026:07:12:24 +0000] \"GET / HTTP/2.0\" 503 20 \"-\" \"-\" 21 \"websecure-shop-shop-shop-example-com@kubernetes\" \"-\" 0ms\n\n$ k get endpointslice -n shop -l kubernetes.io/service-name=web -o jsonpath=…\n10.42.2.2 ready=false\n10.42.1.3 ready=false\n\n$ k describe pod -n shop -l app=web | grep Unhealthy\nWarning  Unhealthy  2s (x9 over 17s)  kubelet  Readiness probe failed: dial tcp 10.42.1.5:8081: connect: connection refused",
    why: "Router vẫn còn nhưng mọi endpoint đang ready=false, nên 503. Đã thử thêm: với RollingUpdate, Pod mới không Ready thì Pod cũ vẫn phục vụ (vẫn 200, chỉ rollout bị kẹt). Phải đổi sang Recreate (hoặc mọi Pod cùng hỏng) mới thấy 503.",
    c: "k get pod -n shop -l app=web\nk describe pod <pod> | grep -i -A2 unhealthy", fix: "Sửa readinessProbe (port, path) hoặc lỗi khiến app không sẵn sàng.", go: ["notready"] },
  { g: "Service & Pod", id: "targetport", n: "targetPort sai (80 thay vì 8080)", at: 7, m: [140, 229], sev: "bad",
    out: "Bad Gateway\n[HTTP 502, 0.009s]\n\n# access log: Traefik gọi IP Pod ở port 80\n10.42.2.0 - - [19/Nov/2026:07:10:52 +0000] \"GET / HTTP/2.0\" 502 11 \"-\" \"-\" 15 \"websecure-shop-shop-shop-example-com@kubernetes\" \"http://10.42.1.3:80\" 0ms\n\n# gói khi không có NetworkPolicy: Pod trả RST vì không ai nghe port 80\n10.42.1.4:33050 → 10.42.1.10:80 TCP SYN\n10.42.1.10:80 → 10.42.1.4:33050 TCP RST\n\n# gói khi có NetworkPolicy chỉ mở 8080: node trả ICMP trước khi gói tới Pod\n10.42.2.0 → 10.42.1.4 ICMP port unreachable (cho gói 10.42.1.4:37526 → 10.42.2.8:80)",
    why: "targetPort 80 nhưng app nghe 8080. Selector vẫn đúng nên EndpointSlice vẫn có IP (port 80), Traefik gọi và bị từ chối ngay, nên 502. IP Pod trong các dòng trên khác bước trước vì Pod đã được tạo lại giữa các lần thử.",
    c: "k get endpointslice -n shop -l kubernetes.io/service-name=web\nk exec <pod> -- netstat -tln", fix: "Đặt targetPort đúng port app nghe, tốt nhất ghi bằng tên containerPort (targetPort: http).", go: ["svc", "s_port"] },
  { g: "Service & Pod", id: "netpol", n: "NetworkPolicy chặn Traefik → web", at: 7, m: [255, 394], sev: "bad",
    out: "Bad Gateway\n[HTTP 502, 0.008s]\n\n10.42.1.4:45266 → 10.42.1.10:8080 TCP SYN\n10.42.1.1 → 10.42.1.4 ICMP port unreachable (cho gói 10.42.1.4:45266 → 10.42.1.10:8080)\n\n# rule của kube-router\n-A KUBE-POD-FW-… -m comment --comment \"rule to REJECT traffic destined for POD name:web-7f797d47b8-fscz2 namespace: shop\" -m mark ! --mark 0x10000/0x10000 -j REJECT --reject-with icmp-port-unreachable",
    why: "Xóa web-from-ingress, còn default-deny, nên mọi traffic vào web bị chặn. NetworkPolicy của k3s (kube-router) REJECT bằng ICMP, Traefik biết ngay và trả 502. CNI chỉ DROP (không trả lời gì) thì Traefik phải chờ tới hết hạn, thường ra 504 (không chạy thử ở đây).",
    c: "k get netpol -n shop\nk describe netpol -n shop", fix: "Thêm rule ingress cho phép namespace của controller tới port của app.", go: ["svc", "s_np"] },
  { g: "Bên trong app", id: "appdns", n: "App gọi sai tên Service", at: 9, m: [840, 58], sev: "warn",
    out: "HTTP 200   ← vẫn 200\ncatalog -> wget: bad address 'catalogg'\n\n# resolver thử lần lượt 4 tên theo search của resolv.conf\n10.42.2.8:54983 → 10.43.0.10:53 UDP DNS hỏi A? catalogg.shop.svc.cluster.local\n10.43.0.10:53 → 10.42.2.8:54983 UDP DNS đáp A catalogg.shop.svc.cluster.local → NXDOMAIN\n10.43.0.10:53 → 10.42.2.8:55908 UDP DNS đáp A catalogg.svc.cluster.local → NXDOMAIN\n10.43.0.10:53 → 10.42.2.8:37242 UDP DNS đáp A catalogg.cluster.local → NXDOMAIN\n10.43.0.10:53 → 10.42.2.8:59895 UDP DNS đáp A catalogg → NXDOMAIN",
    why: "App gọi http://catalogg/ (sai tên). Mỗi tên trong search đều NXDOMAIN. Mã HTTP vẫn 200 vì lỗi nằm bên trong app: mã trạng thái tốt không có nghĩa mọi tầng phía sau đều ổn.",
    c: "k exec <pod> -- nslookup catalog\nk get svc -n shop", fix: "Sửa tên (Service khác namespace thì ghi <svc>.<namespace>).", go: ["dns", "dn_nx"] },
  { g: "Bên trong app", id: "catnp", n: "NetworkPolicy chặn web → catalog", at: 10, m: [255, 394], sev: "warn",
    out: "HTTP 200   ← vẫn 200\ncatalog -> wget: can't connect to remote host (10.43.224.31): Connection refused",
    why: "Xóa catalog-from-web. DNS vẫn trả ClusterIP, kube-proxy vẫn DNAT, nhưng kube-router REJECT trước khi gói vào Pod catalog. App thấy \"Connection refused\" dù catalog vẫn chạy bình thường.",
    c: "k get netpol -n shop\nk exec <pod-web> -- wget -qO- -T2 http://catalog/", fix: "Thêm rule ingress cho catalog từ Pod app=web, port 9000.", go: ["svc", "s_np"] }
];

function rfInit() {
  const box = $("#rfAnim"); let i = 0, fault = null, run = 0;
  const groups = [...new Set(RF_FAULTS.map(f => f.g))];
  box.innerHTML = '<h3 style="margin:0">Một request HTTPS, bắt gói thật ở từng chặng</h3>' +
    '<div class="controls" style="margin:0"><label class="f" style="flex:1;min-width:240px">Bật một lỗi để xem request dừng ở đâu<select id="rfFault"><option value="">Không lỗi: đường đi bình thường</option>' +
    groups.map(g => '<optgroup label="' + esc(g) + '">' + RF_FAULTS.filter(f => f.g === g).map(f => '<option value="' + f.id + '">' + esc(f.n) + "</option>").join("") + "</optgroup>").join("") + "</select></label></div>" +
    '<div class="stage"><svg id="rfSvg" viewBox="0 0 1000 570" role="img" aria-label="Đường đi của một request từ người dùng qua load balancer, node, Ingress controller tới Pod"></svg></div>' +
    '<div class="controls" style="margin:0"><button class="btn" type="button" data-rf="prev">← Trước</button><button class="btn primary" type="button" data-rf="play">▶ Tự chạy</button><button class="btn" type="button" data-rf="next">Sau →</button><button class="btn" type="button" data-rf="reset">Làm lại</button><div class="dots" id="rfDots"></div></div>' +
    '<div class="panel stepbox rf-det" id="rfStep" aria-live="polite"></div>';
  const svg = $("#rfSvg"), G = {};
  [[20, 158, "node01 · 172.18.0.3 · podCIDR 10.42.2.0/24"], [510, 158, "node02 · 172.18.0.4 · podCIDR 10.42.1.0/24"]].forEach(([x, y, l]) => { el("rect", { x, y, width: 470, height: 350, rx: 12, class: "sv-zonefill" }, svg); txt(svg, x + 14, y + 22, l, "sv-lbl"); });
  el("rect", { x: 700, y: 14, width: 280, height: 78, rx: 10, class: "sv-zonefill" }, svg); txt(svg, 712, 28, "controlplane · 172.18.0.2", "sv-lbl");
  txt(svg, 22, 97, "Service: chỉ là rule netfilter trên mọi node, không phải một máy", "sv-s");
  el("path", { d: "M140 494 V530 H855 V494 M365 494 V530", class: "sv-wire", "stroke-dasharray": "5 4" }, svg);
  txt(svg, 610, 548, "mạng giữa các node 172.18.0.0/16", "sv-s", "middle");
  el("path", { d: "M10 92 V472 M992 58 V530", class: "sv-wire", "stroke-dasharray": "2 5" }, svg);
  Object.entries(RF_BOX).forEach(([id, [x, y, w, h, cls, t, sub]]) => {
    const g = lcBox(svg, x, y, w, h, cls, t, sub); g.classList.add("rf-g"); g.dataset.b = id; G[id] = g;
    if (id === "lb" || id.startsWith("svc")) $("rect", g).setAttribute("stroke-dasharray", "6 4");
  });
  const mark = el("g", { class: "rf-x", style: "display:none" }, svg); el("circle", { r: 13 }, mark); txt(mark, 0, 5, "✕", "", "middle");
  const dots = $("#rfDots");
  RF_STEPS.forEach((s, k) => { const b = document.createElement("button"); b.type = "button"; b.textContent = k + 1; b.setAttribute("aria-label", "Bước " + (k + 1) + ": " + s.t); b.onclick = () => go(k, true); dots.appendChild(b); });
  const F = () => fault && RF_FAULTS.find(f => f.id === fault);
  const last = () => { const f = F(); return f ? f.at : RF_STEPS.length - 1; };
  const paint = () => {
    const s = RF_STEPS[i], f = F(), hit = f && f.at === i;
    Object.entries(G).forEach(([id, g]) => { g.classList.toggle("on", s.on.includes(id)); g.classList.remove("bad"); });
    $$("#rfDots button").forEach((b, k) => { b.classList.toggle("cur", k === i); b.classList.toggle("done", k < i); b.disabled = k > last(); });
    svg.querySelectorAll("circle.pkt").forEach(c => c.remove());
    mark.style.display = hit ? "" : "none"; mark.classList.toggle("warn", !!(hit && f.sev === "warn"));
    const near = hit && Object.keys(RF_BOX).reduce((a, b) => { const d = id => Math.hypot(RF_BOX[id][0] + RF_BOX[id][2] / 2 - f.m[0], RF_BOX[id][1] + RF_BOX[id][3] / 2 - f.m[1]); return d(a) <= d(b) ? a : b; });
    if (hit) { const [x, y, w] = RF_BOX[near]; mark.setAttribute("transform", "translate(" + (x + w - 4) + "," + (y + 4) + ")"); }
    const left = '<div class="col" style="gap:8px">' + (hit ? '<span class="small muted">Để so sánh, khi không lỗi thì ở bước này:</span>' : "") + '<span class="ck-dom dom-net">bước ' + (i + 1) + "/" + RF_STEPS.length + "</span><b style=\"font-size:15.5px\">" + esc(s.t) + '</b><div class="rf-hdr">' + esc(s.hdr) + "</div><p style=\"margin:0\">" + s.d + '</p><p class="small" style="margin:0"><b>Port ở chặng này:</b> ' + s.port + "</p>" + lcCode(s.c) + "</div>";
    const ev = '<div class="col" style="gap:6px;min-width:0"><span class="small muted">Bằng chứng bắt thật</span><div class="codewrap"><pre class="code rf-ev">' + esc(s.ev) + "</pre></div></div>";
    const fc = hit ? '<div class="rf-fault ' + f.sev + '"><b>' + (f.sev === "warn" ? "Vẫn trả 200, nhưng hỏng ở đây: " : "Request dừng ở đây: ") + esc(f.n) + '</b><div class="codewrap"><pre class="code rf-ev">' + esc(f.out) + '</pre></div><p style="margin:0">' + esc(f.why) + '</p><p class="small" style="margin:0"><b>Sửa:</b> ' + esc(f.fix) + "</p>" + lcCode(f.c) + '<a class="btn" href="#trouble" data-rfgo="' + f.go.join(",") + '">Mở nhánh này trong cây chẩn đoán →</a></div>' : "";
    $("#rfStep").innerHTML = fc + left + ev;
    if (hit) G[near].classList.add("bad");
    lcEnhance($("#rfStep"));
    const st = svg.parentElement;
    if (st.scrollWidth > st.clientWidth + 4) { const ids = hit ? [near] : s.on, k = svg.clientWidth / 1000, cx = ids.reduce((a, id) => a + RF_BOX[id][0] + RF_BOX[id][2] / 2, 0) / ids.length; st.scrollTo({ left: Math.max(0, cx * k - st.clientWidth / 2), behavior: RM ? "auto" : "smooth" }); }
  };
  const anim = async tok => {
    const s = RF_STEPS[i], f = F(), hit = f && f.at === i;
    for (let k = 0; k < s.pk.length; k++) {
      if (tok !== run || !lcVisible(svg)) return;
      let [pts, cls] = s.pk[k];
      if (hit && f.sev === "bad") { const cut = pts.findIndex(p => Math.hypot(p[0] - f.m[0], p[1] - f.m[1]) < 60); if (cut > 0) pts = pts.slice(0, cut + 1).concat([f.m]); cls = "red"; }
      await lcPkt(svg, pts, { cls, dur: Math.min(2600, 500 + pts.length * 180) });
      if (hit && f.sev === "bad") break;
    }
  };
  const go = (k, animate) => { i = Math.max(0, Math.min(k, last())); const tok = ++run; paint(); if (animate) anim(tok); };
  const play = async () => {
    const tok = ++run; if (i >= last()) i = 0;
    for (; i <= last(); i++) {
      if (tok !== run || !lcVisible(svg)) return;
      paint(); await anim(tok); if (tok !== run) return;
      if (i === last()) break; await sleep(RM ? 0 : 1600);
    }
  };
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-rf]");
    if (b) { const a = b.dataset.rf; if (a === "prev") go(i - 1, true); else if (a === "next") go(i + 1, true); else if (a === "reset") go(0, false); else play(); return; }
    const g = e.target.closest("[data-rfgo]");
    if (g) { e.preventDefault(); trPath = ["root", ...g.dataset.rfgo.split(",")]; show("trouble"); setTimeout(() => { renderTree(); const t = $("#trNode"); if (t) t.scrollIntoView({ block: "center" }); }, 60); }
  });
  $("#rfFault").addEventListener("change", e => { fault = e.target.value || null; const f = F(); run++; go(f ? Math.max(0, f.at - 2) : 0, false); if (f) play(); });
  go(0, false);
  LC_REPLAY.reqflow = () => {};
}
lcOnce("reqflow", rfInit);
