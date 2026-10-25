#!/usr/bin/env bash
# Lab 09 · DaemonSet, Job và CronJob
# File sinh tự động từ src/labs/level2.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: DaemonSet
metadata: {name: node-agent, namespace: lab09}
spec:
  selector: {matchLabels: {app: node-agent}}
  template:
    metadata: {labels: {app: node-agent}}
    spec:
      tolerations:
      - {key: node-role.kubernetes.io/control-plane, operator: Exists, effect: NoSchedule}
      containers:
      - {name: agent, image: busybox:1.36, command: ["sleep", "3600"]}
---
apiVersion: batch/v1
kind: Job
metadata: {name: batch-sum, namespace: lab09}
spec:
  completions: 4
  parallelism: 2
  backoffLimit: 2
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - {name: sum, image: busybox:1.36, command: ["sh", "-c", "echo done"]}
---
apiVersion: batch/v1
kind: CronJob
metadata: {name: report, namespace: lab09}
spec:
  schedule: "*/15 * * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 2
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - {name: report, image: busybox:1.36, command: ["date"]}
EOF
kubectl create job report-now -n lab09 --from=cronjob/report
kubectl wait --for=condition=complete job/batch-sum job/report-now -n lab09 --timeout=180s
kubectl rollout status ds/node-agent -n lab09 --timeout=120s
