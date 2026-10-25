#!/usr/bin/env bash
# Test harness for the labs themselves (not for learners).
# For each lab: setup → verify must FAIL → apply reference solution → verify must PASS → cleanup.
#   tests/run.sh            all labs listed in tests/labs.txt
#   tests/run.sh 05 07      only these labs
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG="${LOG_DIR:-/tmp/cka-lab-tests}"; mkdir -p "$LOG"
ids=("$@"); [ ${#ids[@]} -eq 0 ] && mapfile -t ids < tests/labs.txt
pass=0; fail=0; failed=()
for raw in "${ids[@]}"; do
  id="$(printf '%02d' "$((10#$raw))")"
  d="$(ls -d labs/"$id"-* | head -1)"
  printf '%s %-40s ' "$id" "$(basename "$d")"
  r="ok"
  bash "$d/cleanup.sh" >"$LOG/$id.pre-cleanup.log" 2>&1 || true
  if ! bash "$d/setup.sh" >"$LOG/$id.setup.log" 2>&1; then r="setup failed"
  elif bash "$d/verify.sh" >"$LOG/$id.verify-before.log" 2>&1; then r="verify passed before solving"
  elif ! bash "tests/solutions/$id.sh" >"$LOG/$id.solve.log" 2>&1; then r="solution script failed"
  elif ! bash "$d/verify.sh" >"$LOG/$id.verify-after.log" 2>&1; then r="verify failed after solving"
  fi
  bash "$d/cleanup.sh" >"$LOG/$id.cleanup.log" 2>&1 || true
  kubectl get ns -o name 2>/dev/null | grep -E "^namespace/lab$id(-|$)" | xargs -r kubectl wait --for=delete --timeout=180s >/dev/null 2>&1 || true
  if [ "$r" = ok ]; then echo "PASS"; pass=$((pass+1)); else echo "FAIL ($r) → $LOG/$id.*.log"; fail=$((fail+1)); failed+=("$id"); fi
done
echo; echo "passed $pass, failed $fail ${failed[*]:-}"
[ "$fail" -eq 0 ]
