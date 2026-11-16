#!/usr/bin/env python3
"""Kiểm mọi mẫu trong src/yaml/templates.yaml trên cluster thật:
kubectl apply --dry-run=server -n shop (CRD được tạo thật trước, dọn sau); mẫu kustomize thì render bằng kubectl kustomize rồi dry-run.
Dùng: python3 tools/check_yaml.py [id ...]"""
import os, subprocess, sys, tempfile, yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NS = "shop"

def sh(cmd, inp=None):
    p = subprocess.run(cmd, input=inp, text=True, capture_output=True, shell=isinstance(cmd, str))
    return p.returncode, (p.stdout + p.stderr).strip()

def main():
    data = yaml.safe_load(open(os.path.join(ROOT, "src", "yaml", "templates.yaml"), encoding="utf-8"))
    only = set(sys.argv[1:])
    sh(["kubectl", "wait", "--for=delete", "ns/" + NS, "--timeout=120s"])   # lần chạy trước có thể còn đang xóa
    sh(["kubectl", "create", "ns", NS])
    fails = 0
    for t in data["templates"]:
        if only and t["id"] not in only:
            continue
        docs = [d for d in yaml.safe_load_all(t["yaml"]) if d]
        made = []
        try:
            if t.get("test") == "kustomize":
                with tempfile.TemporaryDirectory() as d:
                    for rel, body in t.get("files", {}).items():
                        os.makedirs(os.path.join(d, os.path.dirname(rel)), exist_ok=True)
                        open(os.path.join(d, rel), "w").write(body)
                    os.makedirs(os.path.join(d, "overlays", "prod"))
                    open(os.path.join(d, "overlays", "prod", "kustomization.yaml"), "w").write(t["yaml"])
                    rc, out = sh(["kubectl", "kustomize", os.path.join(d, "overlays", "prod")])
                    if rc == 0:
                        sh(["kubectl", "create", "ns", "prod"])
                        rc, out = sh(["kubectl", "apply", "--dry-run=server", "-f", "-"], out)
                        sh(["kubectl", "delete", "ns", "prod", "--wait=false"])
            else:
                for c in [d for d in docs if d.get("kind") == "CustomResourceDefinition"]:
                    sh(["kubectl", "apply", "-f", "-"], yaml.safe_dump(c)); made.append(c["metadata"]["name"])
                    sh(["kubectl", "wait", "--for=condition=Established", "crd/" + c["metadata"]["name"], "--timeout=30s"])
                body = t["yaml"]
                for a, b in (t.get("testsub") or {}).items():   # chỗ cluster thử khác máy thi (vd k3s thiếu tzdata)
                    body = body.replace(a, b)
                rc, out = sh(["kubectl", "apply", "-n", NS, "--dry-run=server", "-f", "-"], body)
        finally:
            for m in made:
                sh(["kubectl", "delete", "crd", m, "--wait=false"])
        ok = rc == 0 and "Warning" not in out
        fails += not ok
        print(("ok   " if ok else "FAIL ") + t["id"].ljust(12) + ("" if ok else "\n     " + out.replace("\n", "\n     ")))
    sh(["kubectl", "delete", "ns", NS, "--wait=false"])
    n = len([t for t in data["templates"] if not only or t["id"] in only])
    print("%d/%d mẫu hợp lệ" % (n - fails, n))
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
