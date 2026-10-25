#!/usr/bin/env bash
# Lab 19 · Gateway API, HTTPRoute và ReferenceGrant
# File sinh tự động từ src/labs/level4.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
exec 2>/dev/null
detect_nodes
begin_verify 19 "Gateway API, HTTPRoute và ReferenceGrant"
expect "lab19-app có label gateway-access=true" "$(jp ns lab19-app '{.metadata.labels.gateway-access}')" "true"
expect "Gateway public dùng lab-gc" "$(jp gateway public -n lab19-infra '{.spec.gatewayClassName}')" "lab-gc"
expect "Listener http HTTP:80" "$(jp gateway public -n lab19-infra '{.spec.listeners[?(@.name=="http")].protocol}:{.spec.listeners[?(@.name=="http")].port}')" "HTTP:80"
expect "Listener chỉ nhận namespace có gateway-access=true" "$(jp gateway public -n lab19-infra '{.spec.listeners[0].allowedRoutes.namespaces.from}:{.spec.listeners[0].allowedRoutes.namespaces.selector.matchLabels.gateway-access}')" "Selector:true"
expect "shop gắn vào public (lab19-infra)" "$(jp httproute shop -n lab19-app '{.spec.parentRefs[0].name}:{.spec.parentRefs[0].namespace}')" "public:lab19-infra"
expect "shop host shop.lab.local" "$(jp httproute shop -n lab19-app '{.spec.hostnames[*]}')" "shop.lab.local"
hdr=$(jp httproute shop -n lab19-app '{range .spec.rules[*]}{.matches[*].headers[*].name}={.matches[*].headers[*].value}>{.backendRefs[*].name}{"\n"}{end}' | grep '^x-canary=')
expect "Header x-canary=true → chỉ api-v2" "$hdr" "x-canary=true>api-v2"
w=$(jp httproute shop -n lab19-app '{range .spec.rules[*]}{.matches[*].path.value}|{range .backendRefs[*]}{.name}:{.port}:{.weight} {end}{"\n"}{end}' | grep '^/api|' | xargs)
expect "/api chia api 90 / api-v2 10" "$w" "/api|api:8080:90 api-v2:8080:10"
rules=$(jp httproute shop -n lab19-app '{range .spec.rules[*]}{.matches[*].path.value}|{.backendRefs[*].name}:{.backendRefs[*].port}{"\n"}{end}')
check "/ → web:80" grep -qx '/|web:80' <<<"$rules"
expect "admin trỏ Service admin ở lab19-app" "$(jp httproute admin -n lab19-infra '{.spec.rules[0].backendRefs[0].name}:{.spec.rules[0].backendRefs[0].namespace}:{.spec.rules[0].backendRefs[0].port}')" "admin:lab19-app:80"
expect "ReferenceGrant cho HTTPRoute từ lab19-infra" "$(jp referencegrant allow-infra-routes -n lab19-app '{.spec.from[0].kind}:{.spec.from[0].namespace}:{.spec.to[0].kind}')" "HTTPRoute:lab19-infra:Service"
end_verify
