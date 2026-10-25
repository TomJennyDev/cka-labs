#!/usr/bin/env bash
# Lab 06 · ConfigMap và Secret
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
require_env any
detect_nodes
answers_dir; rm -f "$ANS"/06-token.txt
ns_fresh lab06
printf 'feature.search=true\ncache.ttl=300\n' > "$ANS/06-app.properties"
kubectl create secret generic legacy-token -n lab06 --from-literal=token="tok-$RANDOM$RANDOM" >/dev/null
echo "✔ Đã dựng xong tình huống."
