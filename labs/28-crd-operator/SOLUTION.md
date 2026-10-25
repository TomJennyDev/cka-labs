# Lời giải · Lab 28 · CustomResourceDefinition và Operator

```yaml
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
---
apiVersion: ops.example.com/v1
kind: Backup
metadata: {name: nightly, namespace: lab28}
spec: {schedule: "0 2 * * *", retention: 7}
```
```bash
kubectl get bk -n lab28                # có cột SCHEDULE, RETENTION
kubectl explain backup.spec
# bad: The Backup "bad" is invalid: spec.retention: Invalid value: 100: must be less than or equal to 30
kubectl api-resources --api-group=ops.example.com
echo bk > ~/cka-answers/28-short.txt
```
