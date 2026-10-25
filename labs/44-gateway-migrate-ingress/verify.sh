#!/usr/bin/env bash
# Lab 44 · Gateway API với controller thật - HTTPS và chuyển từ Ingress
# File sinh tự động từ src/labs/level4-extra.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 44 "Gateway API với controller thật - HTTPS và chuyển từ Ingress"
expect "Gateway shop-gw class nginx" "$(jp gateway shop-gw -n lab44 '{.spec.gatewayClassName}')" "nginx"
expect "Listener https: HTTPS 443" "$(jp gateway shop-gw -n lab44 '{.spec.listeners[?(@.name=="https")].protocol}:{.spec.listeners[?(@.name=="https")].port}')" "HTTPS:443"
expect "Listener https dùng Secret shop-tls" "$(jp gateway shop-gw -n lab44 '{.spec.listeners[?(@.name=="https")].tls.certificateRefs[0].name}')" "shop-tls"
expect "Listener http: HTTP 80" "$(jp gateway shop-gw -n lab44 '{.spec.listeners[?(@.name=="http")].protocol}:{.spec.listeners[?(@.name=="http")].port}')" "HTTP:80"
expect "Gateway Programmed" "$(jp gateway shop-gw -n lab44 '{.status.conditions[?(@.type=="Programmed")].status}')" "True"
expect "HTTPRoute shop chỉ gắn listener https" "$(jp httproute shop -n lab44 '{.spec.parentRefs[*].sectionName}')" "https"
expect "HTTPRoute shop Accepted" "$(jp httproute shop -n lab44 '{.status.parents[0].conditions[?(@.type=="Accepted")].status}')" "True"
expect "HTTPRoute shop-redirect gắn listener http" "$(jp httproute shop-redirect -n lab44 '{.spec.parentRefs[*].sectionName}')" "http"
ip="$(jp svc -n lab44 -l gateway.networking.k8s.io/gateway-name=shop-gw '{.items[0].spec.clusterIP}')"
[ -n "$ip" ] || ip="$(kubectl get svc -n lab44 -o name 2>/dev/null | grep shop-gw | head -1 | xargs -r kubectl get -n lab44 -o jsonpath='{.spec.clusterIP}' 2>/dev/null)"
check "Tìm thấy Service của Gateway ($ip)" test -n "$ip"
out="$(pod_run lab44 "curl -sk -m 5 --resolve shop.lab44.local:443:$ip https://shop.lab44.local/; echo; curl -sk -m 5 --resolve shop.lab44.local:443:$ip https://shop.lab44.local/api/health; echo; curl -s -m 5 -o /dev/null -w '%{http_code}' --resolve shop.lab44.local:80:$ip http://shop.lab44.local/" run=probe curlimages/curl:8.11.1 | tr -s '\n' ' ')"
expect "HTTPS / → web, /api/health → api, HTTP → 301" "$out" "web api 301"
check_not "Ingress shop đã xóa" exists ingress shop -n lab44
end_verify
