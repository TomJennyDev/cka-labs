#!/usr/bin/env bash
# Tạo 3 máy ảo Ubuntu 24.04 cho lab bằng Multipass (macOS, Windows, Linux).
#   controlplane  2 CPU, 4 GB RAM
#   node01        2 CPU, 3 GB RAM
#   node02        2 CPU, 3 GB RAM
# Biến môi trường tùy chọn: NODES="controlplane node01 node02" EXTRA="controlplane2"
# Sau khi chạy: multipass shell controlplane
set -euo pipefail

NODES=${NODES:-"controlplane node01 node02"}
EXTRA=${EXTRA:-}            # ví dụ EXTRA=controlplane2 cho lab 27 (HA)
IMAGE=${IMAGE:-24.04}

command -v multipass >/dev/null || { echo "Cần cài Multipass: https://multipass.run"; exit 1; }

for n in $NODES $EXTRA; do
  if multipass info "$n" >/dev/null 2>&1; then
    echo "• $n đã tồn tại"
    continue
  fi
  case "$n" in
    controlplane*) cpu=2; mem=4G ;;
    *)             cpu=2; mem=3G ;;
  esac
  echo "• Tạo $n ($cpu CPU, $mem)"
  multipass launch "$IMAGE" --name "$n" --cpus "$cpu" --memory "$mem" --disk 20G
done

# /etc/hosts trên mọi node: tên node và tên k8s-api (endpoint của control plane)
HOSTS=""
for n in $NODES $EXTRA; do
  ip=$(multipass info "$n" --format csv | awk -F, 'NR==2{print $3}')
  HOSTS+="$ip $n"$'\n'
done
CP_IP=$(multipass info controlplane --format csv | awk -F, 'NR==2{print $3}')
HOSTS+="$CP_IP k8s-api"$'\n'

for n in $NODES $EXTRA; do
  printf '%s' "$HOSTS" | multipass exec "$n" -- sudo bash -c 'sed -i "/# cka-labs/,/# end cka-labs/d" /etc/hosts; { echo "# cka-labs"; cat; echo "# end cka-labs"; } >> /etc/hosts'
done

# Khóa SSH từ controlplane tới các node khác (user ubuntu), để `ssh node01` hoạt động như trong đề
multipass exec controlplane -- bash -c 'test -f ~/.ssh/id_ed25519 || ssh-keygen -q -t ed25519 -N "" -f ~/.ssh/id_ed25519'
PUB=$(multipass exec controlplane -- cat /home/ubuntu/.ssh/id_ed25519.pub)
for n in $NODES $EXTRA; do
  multipass exec "$n" -- bash -c "grep -qF '$PUB' ~/.ssh/authorized_keys || echo '$PUB' >> ~/.ssh/authorized_keys"
done
multipass exec controlplane -- bash -c 'printf "Host *\n  StrictHostKeyChecking accept-new\n" > ~/.ssh/config; chmod 600 ~/.ssh/config'

echo
echo "Xong. Các node:"
printf '%s' "$HOSTS"
echo
echo "Tiếp theo:"
echo "  multipass shell controlplane"
echo "  git clone https://github.com/<bạn>/cka-labs.git && cd cka-labs"
echo "  ./bin/cka open 01"
