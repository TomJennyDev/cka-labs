#!/usr/bin/env python3
"""Kiểm tra bộ file mẫu trong examples/ trên cluster đang kết nối (không tạo workload thật).

    python3 tools/check_examples.py

1. values.yaml (và values-prod.yaml gộp vào) khớp values.schema.json
2. Render Helm chart: dùng `helm template` nếu có, nếu không dùng tools/minihelm (Go)
3. Render Kustomize: base, overlays/dev, overlays/prod
4. Tạo namespace đích (Pod Security restricted), rồi `kubectl apply --dry-run=server`
   mọi object; cảnh báo PodSecurity cũng tính là lỗi.
"""
import copy, json, os, shutil, subprocess, sys, tempfile
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "examples", "web-api")
CHART = os.path.join(APP, "helm", "web-api")
fails = 0


def run(cmd, inp=None, check=True, cwd=None):
    r = subprocess.run(cmd, input=inp, capture_output=True, text=True, cwd=cwd)
    if check and r.returncode:
        raise SystemExit("✘ %s\n%s" % (" ".join(cmd), r.stderr.strip()))
    return r


def merge(a, b):
    out = copy.deepcopy(a)
    for k, v in (b or {}).items():
        out[k] = merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def helm_render(values_files, release, ns):
    if shutil.which("helm"):
        cmd = ["helm", "template", release, CHART, "-n", ns]
        for f in values_files[1:]:
            cmd += ["-f", f]
        return run(cmd).stdout
    vals = {}
    for f in values_files:
        vals = merge(vals, yaml.safe_load(open(f)))
    with tempfile.TemporaryDirectory() as t:
        shutil.copytree(CHART, os.path.join(t, "c"))
        json.dump(yaml.safe_load(open(os.path.join(CHART, "Chart.yaml"))), open(os.path.join(t, "c", "Chart.json"), "w"))
        json.dump(vals, open(os.path.join(t, "v.json"), "w"))
        return run(["go", "run", ".", os.path.join(t, "c"), os.path.join(t, "v.json"), release, ns],
                   cwd=os.path.join(ROOT, "tools", "minihelm")).stdout


def check_set(label, text, namespace=None):
    global fails
    docs = [d for d in yaml.safe_load_all(text) if d]
    nss = {d["metadata"]["name"] for d in docs if d["kind"] == "Namespace"} | ({namespace} if namespace else set())
    for ns in nss:
        run(["kubectl", "wait", "--for=delete", "ns/" + ns, "--timeout=120s"], check=False)
        run(["kubectl", "create", "ns", ns], check=False)
        run(["kubectl", "label", "ns", ns, "--overwrite", "pod-security.kubernetes.io/enforce=restricted",
             "pod-security.kubernetes.io/warn=restricted"])
    args = ["kubectl", "apply", "--dry-run=server", "-f", "-"] + (["-n", namespace] if namespace else [])
    r = run(args, inp=text, check=False)
    warn = [l for l in r.stderr.splitlines() if ("Warning" in l or "rror" in l) and "last-applied-configuration" not in l]
    kinds = sorted({"%s/%s" % (d["kind"], d["metadata"]["name"]) for d in docs})
    if r.returncode or warn:
        fails += 1
        print("✘ %s\n  %s" % (label, "\n  ".join(warn or r.stderr.splitlines())))
    else:
        print("✔ %s: %d object (%s)" % (label, len(docs), ", ".join(k.split("/")[0] for k in kinds)))
    for ns in nss:
        run(["kubectl", "delete", "ns", ns, "--wait=true", "--timeout=120s"], check=False)


def main():
    global fails
    # 1 · schema
    try:
        import jsonschema
    except ImportError:
        run([sys.executable, "-m", "pip", "install", "-q", "--break-system-packages", "jsonschema"])
        import jsonschema
    schema = json.load(open(os.path.join(CHART, "values.schema.json")))
    base = yaml.safe_load(open(os.path.join(CHART, "values.yaml")))
    prod = merge(base, yaml.safe_load(open(os.path.join(CHART, "values-prod.yaml"))))
    for name, v in (("values.yaml", base), ("values.yaml + values-prod.yaml", prod)):
        try:
            jsonschema.validate(v, schema)
            print("✔ schema: %s" % name)
        except jsonschema.ValidationError as e:
            fails += 1
            print("✘ schema: %s: %s" % (name, e.message))
    bad = merge(base, {"image": {"pullPolicy": "Sometimes"}})
    try:
        jsonschema.validate(bad, schema)
        fails += 1
        print("✘ schema phải từ chối pullPolicy sai")
    except jsonschema.ValidationError:
        print("✔ schema từ chối giá trị sai (pullPolicy: Sometimes)")
    # 2 · helm
    v = os.path.join(CHART, "values.yaml")
    check_set("helm template (values.yaml)", helm_render([v], "web-api", "chart-dev"), "chart-dev")
    check_set("helm template (+ values-prod.yaml)", helm_render([v, os.path.join(CHART, "values-prod.yaml")], "shop", "chart-prod"), "chart-prod")
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False) as t:
        yaml.safe_dump({"ingress": {"enabled": True, "className": "nginx", "tlsSecret": "api-tls"},
                        "autoscaling": {"enabled": False}, "existingSecret": "web-api-secrets",
                        "image": {"digest": "sha256:" + "a" * 64}}, t)
    check_set("helm template (ingress, không HPA, digest, existingSecret)", helm_render([v, t.name], "alt", "chart-alt"), "chart-alt")
    os.unlink(t.name)
    # 3 · kustomize
    for o in ("base", "overlays/dev", "overlays/prod"):
        check_set("kustomize %s" % o, run(["kubectl", "kustomize", os.path.join(APP, o)]).stdout)
    print("\n%s" % ("ĐẠT" if not fails else "CÓ LỖI: %d" % fails))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
