#!/usr/bin/env bash
# Shared helpers for setup.sh, verify.sh and cleanup.sh of every lab.
# Sourced, never executed directly.

LAB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANS="${CKA_ANSWERS:-$HOME/cka-answers}"
export LAB_ROOT ANS

if [ -t 1 ]; then
  C_OK=$'\e[32m'; C_BAD=$'\e[31m'; C_DIM=$'\e[2m'; C_B=$'\e[1m'; C_Y=$'\e[33m'; C_0=$'\e[0m'
else
  C_OK=""; C_BAD=""; C_DIM=""; C_B=""; C_Y=""; C_0=""
fi

die()  { echo "${C_BAD}✘ $*${C_0}" >&2; exit 1; }
info() { echo "${C_DIM}› $*${C_0}"; }
say()  { echo "$*"; }

# kubectl without the noise some distributions print on stderr
kq() { kubectl "$@" 2>/dev/null; }
# jp <kubectl get args...> <jsonpath>   e.g. jp deploy web -n lab05 '{.spec.replicas}'
jp() { local p="${!#}"; local n=$(( $# - 1 )); kubectl get "${@:1:$n}" -o "jsonpath=$p" 2>/dev/null; }
exists() { kubectl get "$@" >/dev/null 2>&1; }

# ---------- nodes ----------
# CP     first control-plane node
# NODE1  first worker, NODE2 second worker (sorted by name)
detect_nodes() {
  CP="$(kubectl get nodes -l node-role.kubernetes.io/control-plane -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)"
  local workers
  workers="$(kubectl get nodes -l '!node-role.kubernetes.io/control-plane' -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' 2>/dev/null | sort)"
  NODE1="$(echo "$workers" | sed -n 1p)"
  NODE2="$(echo "$workers" | sed -n 2p)"
  export CP NODE1 NODE2
}

# How do we reach a node's shell? docker container (kind / test cluster) or ssh (VMs)
node_mode() {
  if command -v docker >/dev/null 2>&1 && docker inspect "$1" >/dev/null 2>&1; then echo docker; else echo ssh; fi
}
# node_exec <node> <shell script...>   runs as root on the node, non-interactive
node_exec() {
  local n="$1"; shift
  if [ "$(node_mode "$n")" = docker ]; then
    printf '%s\n' "$*" | docker exec -i "$n" sh -s
  else
    printf '%s\n' "$*" | ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$n" 'sudo sh -s'
  fi
}
# node_put <node> <local-file> <remote-path>
node_put() {
  if [ "$(node_mode "$1")" = docker ]; then docker cp "$2" "$1:$3" >/dev/null
  else scp -q -o StrictHostKeyChecking=accept-new "$2" "$1:/tmp/.labput" && ssh "$1" "sudo mv /tmp/.labput '$3'"; fi
}

# kind | kubeadm | k3s (k3s is only used by the repo's own test harness)
flavor() {
  detect_nodes
  if node_exec "$CP" 'test -d /var/lib/rancher/k3s' >/dev/null 2>&1; then echo k3s; return; fi
  if [ "$(node_mode "$CP")" = docker ]; then echo kind; else echo kubeadm; fi
}

# require_env any|kind|vm
require_env() {
  kubectl version >/dev/null 2>&1 || kubectl get --raw /readyz >/dev/null 2>&1 || die "Không kết nối được cluster. Kiểm tra: kubectl get nodes"
  detect_nodes
  [ -n "$NODE1" ] || die "Lab cần ít nhất 1 worker node. Dựng cluster theo lab 00."
  local f; f="$(flavor)"
  case "$1" in
    any) ;;
    kind) node_exec "$NODE1" true >/dev/null 2>&1 || die "Lab này cần vào shell của node ($NODE1). Với kind cần Docker; với VM cần ssh không mật khẩu tới node." ;;
    vm)   [ "$f" = kubeadm ] || die "Lab này cần cluster kubeadm trên máy ảo (env/kubeadm). Cluster hiện tại: $f." ;;
  esac
}

# kubelet static pod directory on a node
static_dir() {
  local d
  d="$(node_exec "$1" "awk '/^staticPodPath:/{print \$2}' /var/lib/kubelet/config.yaml 2>/dev/null")"
  [ -n "$d" ] && { echo "$d"; return; }
  node_exec "$1" 'test -d /var/lib/rancher/k3s' >/dev/null 2>&1 && { echo /var/lib/rancher/k3s/agent/pod-manifests; return; }
  echo /etc/kubernetes/manifests
}

wait_for() { # wait_for <seconds> <command...>
  local t="$1"; shift; local i=0
  until "$@" >/dev/null 2>&1; do i=$((i+2)); [ "$i" -ge "$t" ] && return 1; sleep 2; done
}
ns_fresh() { # recreate namespace(s) cleanly
  for ns in "$@"; do
    kubectl delete ns "$ns" --ignore-not-found --wait=true >/dev/null 2>&1 || true
    kubectl create ns "$ns" >/dev/null
  done
}
answers_dir() { mkdir -p "$ANS"; }
# ans <file>  → answer file content with all whitespace removed ("" if missing)
ans() { { tr -d '[:space:]' < "$ANS/$1"; } 2>/dev/null; }
# ansraw <file> → answer file content as is
ansraw() { { cat "$ANS/$1"; } 2>/dev/null; }

# ---------- verify ----------
_PASS=0; _FAIL=0
begin_verify() { _PASS=0; _FAIL=0; echo "${C_B}Lab $1 · $2${C_0}"; }
ok()  { echo "  ${C_OK}✔${C_0} $1"; _PASS=$((_PASS+1)); }
bad() { echo "  ${C_BAD}✘${C_0} $1${2:+ ${C_DIM}— $2${C_0}}"; _FAIL=$((_FAIL+1)); }
# check "description" command...      passes if the command exits 0
check() { local d="$1"; shift; if "$@" >/dev/null 2>&1; then ok "$d"; else bad "$d"; fi; }
# check_not "description" command...  passes if the command FAILS (e.g. traffic must be blocked)
check_not() { local d="$1"; shift; if "$@" >/dev/null 2>&1; then bad "$d"; else ok "$d"; fi; }
# expect "description" "<actual>" "<expected>"
expect() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "đang là '${2:-<trống>}', cần '$3'"; fi; }
# expect_match "description" "<actual>" "<extended regex>"
expect_match() { if [[ "$2" =~ $3 ]]; then ok "$1"; else bad "$1" "đang là '${2:-<trống>}'"; fi; }
# expect_ge "description" <actual> <min>
expect_ge() { if [ "${2:-0}" -ge "$3" ] 2>/dev/null; then ok "$1"; else bad "$1" "đang là '${2:-0}', cần ≥ $3"; fi; }
end_verify() {
  local total=$((_PASS+_FAIL))
  echo
  if [ "$_FAIL" -eq 0 ]; then
    echo "${C_OK}${C_B}ĐẠT${C_0} ${_PASS}/${total} kiểm tra."
    exit 0
  else
    echo "${C_BAD}${C_B}CHƯA ĐẠT${C_0} ${_PASS}/${total} kiểm tra. Sửa các mục ✘ rồi chạy lại ./lab check."
    exit 1
  fi
}
# from inside a throwaway pod: can it reach url? (busybox wget, 3 s timeout)
can_reach() { # can_reach <namespace> <url> [pod-labels]
  local ns="$1" url="$2" labels="${3:-run=probe}" name="probe-$RANDOM"
  kubectl run "$name" -n "$ns" --image=busybox:1.36 --restart=Never --labels="$labels" \
    --command -- sh -c "wget -qO- -T 3 '$url' >/dev/null" >/dev/null 2>&1 || return 1
  local phase=""
  for _ in $(seq 1 30); do
    phase="$(kubectl get pod "$name" -n "$ns" -o jsonpath='{.status.phase}' 2>/dev/null)"
    [ "$phase" = Succeeded ] || [ "$phase" = Failed ] && break; sleep 1
  done
  kubectl delete pod "$name" -n "$ns" --now >/dev/null 2>&1 || true
  [ "$phase" = Succeeded ]
}
