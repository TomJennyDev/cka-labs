#!/usr/bin/env python3
"""Bắt gói kiểu tcpdump bằng AF_PACKET, dùng khi node không có tcpdump. Dùng cho bài 4.1.
Trên node: sudo python3 tools/sniff.py node01 10
Node là container Docker (k3s/kind): sudo nsenter -n -t $(docker inspect -f '{{.State.Pid}}' node01) python3 tools/sniff.py node01 10
In: SYN / SYN-ACK, gói dữ liệu đầu tiên của mỗi kết nối (dòng HTTP hoặc TLS + SNI),
DNS hỏi/đáp, ICMP unreachable, và gói VXLAN (UDP 8472) kèm gói bên trong. Bỏ qua cổng control plane."""
import socket, struct, sys, time

label, dur = sys.argv[1], float(sys.argv[2])
IGN = {6443, 10250, 2379, 2380, 10248, 10249, 10256, 10257, 10259, 9100}
s = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, socket.ntohs(3))
s.settimeout(0.2)
t0 = time.time(); seen = set()

def ip4(b): return socket.inet_ntoa(b)

def sni(p):
    try:
        if p[0] != 0x16 or p[5] != 1: return ""
        i = 5 + 4 + 2 + 32
        i += 1 + p[i]
        i += 2 + struct.unpack("!H", p[i:i+2])[0]
        i += 1 + p[i]
        end = i + 2 + struct.unpack("!H", p[i:i+2])[0]; i += 2
        while i < end:
            t, l = struct.unpack("!HH", p[i:i+4])
            if t == 0: return p[i+9:i+9+struct.unpack("!H", p[i+7:i+9])[0]].decode()
            i += 4 + l
    except Exception: return ""
    return ""

def dns(p):
    try:
        qid, fl, qd, an = struct.unpack("!HHHH", p[:8]); i = 12; n = []
        while p[i]: n.append(p[i+1:i+1+p[i]].decode()); i += 1 + p[i]
        qt = struct.unpack("!H", p[i+1:i+3])[0]; i += 5; name = ".".join(n); qn = {1: "A", 28: "AAAA"}.get(qt, str(qt))
        if not fl & 0x8000: return "hỏi " + qn + "? " + name
        rc = fl & 0xF; ans = []
        for _ in range(an):
            if p[i] & 0xC0 == 0xC0: i += 2
            else:
                while p[i]: i += 1 + p[i]
                i += 1
            t, c, ttl, rl = struct.unpack("!HHIH", p[i:i+10]); i += 10
            if t == 1: ans.append(ip4(p[i:i+4]))
            i += rl
        return "đáp " + qn + " " + name + " → " + (", ".join(ans) if ans else ["NOERROR", "FORMERR", "SERVFAIL", "NXDOMAIN"][min(rc, 3)])
    except Exception: return "dns?"

def parse(ipb, ifc=""):
    if ipb[0] >> 4 != 4: return None
    ihl = (ipb[0] & 15) * 4; proto = ipb[9]; src, dst = ip4(ipb[12:16]), ip4(ipb[16:20])
    if proto == 6:
        sp, dp, seq, ack, off, fl = struct.unpack("!HHIIBB", ipb[ihl:ihl+14])
        if sp in IGN or dp in IGN: return None
        pay = ipb[ihl + (off >> 4) * 4:]
        flags = "".join(c for c, b in (("S", 2), ("A", 16), ("F", 1), ("R", 4)) if fl & b)
        key = (ifc, src, sp, dst, dp)
        if fl & 2: tag = "SYN" if not fl & 16 else "SYN-ACK"
        elif fl & 4: tag = "RST"
        elif pay and key not in seen:
            seen.add(key)
            if pay[:1] == b"\x16": tag = "TLS ClientHello SNI=" + sni(pay) if pay[5:6] == b"\x01" else "TLS ServerHello"
            elif pay[:4] in (b"GET ", b"POST", b"HTTP"): tag = pay.split(b"\r\n")[0].decode(errors="replace")
            else: tag = "dữ liệu %dB" % len(pay)
        else: return None
        return "%s:%d → %s:%d TCP %s" % (src, sp, dst, dp, tag)
    if proto == 1 and ipb[ihl] == 3:
        inner = ipb[ihl+8:]; ih = (inner[0] & 15) * 4; isp, idp = struct.unpack("!HH", inner[ih:ih+4])
        return "%s → %s ICMP %s (cho gói %s:%d → %s:%d)" % (src, dst, {3: "port unreachable", 1: "host unreachable", 13: "admin prohibited"}.get(ipb[ihl+1], "unreachable"), ip4(inner[12:16]), isp, ip4(inner[16:20]), idp)
    if proto == 17:
        sp, dp = struct.unpack("!HH", ipb[ihl:ihl+4]); pay = ipb[ihl+8:]
        if dp == 8472 or sp == 8472:
            inner = parse(pay[8+14:], ifc + "/in")
            return ("[VXLAN %s → %s UDP %d] bên trong: %s" % (src, dst, dp, inner)) if inner else None
        if 53 in (sp, dp): return "%s:%d → %s:%d UDP DNS %s" % (src, sp, dst, dp, dns(pay))
    return None

while time.time() - t0 < dur:
    try: pkt, addr = s.recvfrom(65535)
    except socket.timeout: continue
    if addr[0] == "lo": continue
    if struct.unpack("!H", pkt[12:14])[0] != 0x0800: continue
    r = parse(pkt[14:], addr[0])
    if r: print("%.6f %-7s %-12s %s" % (time.time(), label, addr[0], r), flush=True)
