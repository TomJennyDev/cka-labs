#!/usr/bin/env python3
"""Chạy lời giải của các bài CKAD (src/ckad/exercises.yaml) trên cluster hiện tại rồi chạy lệnh check.

  python3 tools/check_ckad.py            # mọi bài có test khác false
  python3 tools/check_ckad.py b-job e-cm # chỉ vài bài

Bài dùng namespace ck-*; script xóa các namespace này trước và sau khi chạy.
"""
import os, subprocess, sys, tempfile, time, yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRE = "set -e\nshopt -s expand_aliases\nalias k=kubectl\n"


def sh(script, cwd=None, timeout=300):
    try:
        p = subprocess.run(["bash", "-c", PRE + script], cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout + p.stderr)[-1500:]
    except subprocess.TimeoutExpired:
        return 124, "timeout"


def check_script(src):
    out = []
    for line in src.splitlines():
        s = line.strip()
        out.append("if " + s[2:] + "; then exit 1; fi" if s.startswith("! ") else line)
    return "\n".join(out)


def cleanup_ns():
    subprocess.run("kubectl get ns -o name | grep '^namespace/ck-' | xargs -r kubectl delete --wait=false >/dev/null 2>&1", shell=True)
    for _ in range(60):
        if not subprocess.run("kubectl get ns -o name | grep -q '^namespace/ck-'", shell=True).returncode:
            time.sleep(3)
        else:
            return


def main():
    ex = yaml.safe_load(open(os.path.join(ROOT, "src", "ckad", "exercises.yaml"), encoding="utf-8"))
    only = set(sys.argv[1:])
    todo = [e for e in ex if e.get("test", True) and (not only or e["id"] in only)]
    cleanup_ns()
    for e in todo:
        if e.get("cleanup"):
            sh(e["cleanup"] + " >/dev/null 2>&1 || true")
    made, res = set(), []
    for e in todo:
        t0 = time.time()
        ns = e.get("ns")
        if ns and ns not in made:
            subprocess.run(["kubectl", "create", "ns", ns], capture_output=True)
            made.add(ns)
        if e.get("workdir"):
            subprocess.run(["rm", "-rf", e["workdir"]])
        work = tempfile.mkdtemp(prefix="ckad-")
        code, log = 0, ""
        if e.get("setup"):
            code, log = sh(e["setup"], work)
        if code == 0:
            code, log = sh(e["sol"], work)
        stage = "sol"
        if code == 0:
            stage = "check"
            code, log = sh(check_script(e["check"]), work)
        subprocess.run("kubectl config set-context --current --namespace=default >/dev/null", shell=True)
        ok = code == 0
        res.append((e["id"], ok))
        print(("ĐẠT  " if ok else "LỖI  ") + e["id"].ljust(14) + "%5.0fs" % (time.time() - t0) + ("" if ok else "  [" + stage + "]\n" + log), flush=True)
    for e in todo:
        if e.get("cleanup"):
            sh(e["cleanup"] + " >/dev/null 2>&1 || true")
    cleanup_ns()
    bad = [i for i, ok in res if not ok]
    print("\n%d/%d đạt" % (len(res) - len(bad), len(res)) + ("" if not bad else ": lỗi " + ", ".join(bad)))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
