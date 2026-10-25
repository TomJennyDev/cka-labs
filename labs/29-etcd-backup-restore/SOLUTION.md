# Lời giải · Lab 29 · Sao lưu và khôi phục etcd

```bash
./lab ssh $CP
grep data-dir /etc/kubernetes/manifests/etcd.yaml | cut -d= -f2 > /root/29-datadir.txt   # /var/lib/etcd
E="--endpoints=https://127.0.0.1:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/server.crt --key=/etc/kubernetes/pki/etcd/server.key"
etcdctl $E snapshot save /opt/etcd-backup.db
etcdutl snapshot status /opt/etcd-backup.db -w table
exit

kubectl create ns lab29-after

./lab ssh $CP
etcdutl snapshot restore /opt/etcd-backup.db --data-dir /var/lib/etcd-restore
vi /etc/kubernetes/manifests/etcd.yaml
#   volumes:
#   - hostPath: {path: /var/lib/etcd-restore, type: DirectoryOrCreate}
#     name: etcd-data
# (chỉ cần đổi hostPath; --data-dir trong container vẫn là /var/lib/etcd)
watch crictl ps      # chờ etcd và kube-apiserver chạy lại
exit
kubectl get ns | grep lab29        # chỉ còn lab29-before
```
