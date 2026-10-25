#!/usr/bin/env bash
# Lab 28 · CustomResourceDefinition và Operator
# File sinh tự động từ src/labs/level7.yaml. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../lib/common.sh"
detect_nodes
set -e
kubectl apply -f - <<'EOF'
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata: {name: backups.ops.example.com}
spec:
  group: ops.example.com
  scope: Namespaced
  names: {kind: Backup, plural: backups, singular: backup, shortNames: [bk]}
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            required: [schedule]
            properties:
              schedule: {type: string}
              retention: {type: integer, minimum: 1, maximum: 30}
    additionalPrinterColumns:
    - {name: Schedule, type: string, jsonPath: .spec.schedule}
    - {name: Retention, type: integer, jsonPath: .spec.retention}
EOF
kubectl wait --for=condition=Established crd/backups.ops.example.com --timeout=60s
kubectl apply -f - <<'EOF'
apiVersion: ops.example.com/v1
kind: Backup
metadata: {name: nightly, namespace: lab28}
spec: {schedule: "0 2 * * *", retention: 7}
EOF
kubectl api-resources --api-group=ops.example.com --no-headers | awk '{print $2}' > "$ANS/28-short.txt"
