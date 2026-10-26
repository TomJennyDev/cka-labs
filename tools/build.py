#!/usr/bin/env python3
"""Build every generated file of the repo from src/labs/*.yaml.

    pip install pyyaml markdown
    python3 tools/build.py

Outputs: labs/NN-slug/{README.md,SOLUTION.md,setup.sh,verify.sh,cleanup.sh,.meta},
tests/solutions/NN.sh, tests/labs.txt, the lab table in README.md and docs/index.html.
"""
import glob
import html
import json
import os
import re
import shutil
import stat
import sys

import markdown
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DOMAINS = {
    "trouble": ("Troubleshooting", 30, ["Troubleshoot cluster và node", "Troubleshoot thành phần control plane",
                                         "Theo dõi tài nguyên cluster và ứng dụng", "Quản lý và đánh giá output, log của container",
                                         "Troubleshoot Service và networking"]),
    "arch": ("Cluster Architecture, Installation & Configuration", 25, ["Quản lý RBAC", "Chuẩn bị hạ tầng để cài cluster",
                                         "Tạo và quản lý cluster bằng kubeadm", "Quản lý vòng đời cluster (nâng cấp)",
                                         "Control plane high-availability", "Cài thành phần bằng Helm và Kustomize",
                                         "Interface mở rộng: CNI, CSI, CRI", "CRD, cài và cấu hình Operator"]),
    "net": ("Services & Networking", 20, ["Kết nối giữa các Pod", "NetworkPolicy", "Service ClusterIP, NodePort, LoadBalancer và endpoints",
                                         "Gateway API", "Ingress controller và Ingress", "CoreDNS"]),
    "work": ("Workloads & Scheduling", 15, ["Deployment, rolling update, rollback", "ConfigMap và Secret", "Autoscaling",
                                         "Primitive cho ứng dụng tự phục hồi", "Admission và scheduling của Pod"]),
    "stor": ("Storage", 10, ["StorageClass và dynamic provisioning", "Volume type, access mode, reclaim policy",
                                         "PersistentVolume và PersistentVolumeClaim"]),
}
LEVELS = {
    0: ("Chuẩn bị môi trường", "Dựng cluster lab và làm quen công cụ."),
    1: ("Nền tảng kubectl", "Làm chủ kubectl, object, YAML và cách trích xuất dữ liệu."),
    2: ("Workloads", "Deployment, cấu hình, probe, multi-container, Job, tài nguyên và autoscaling."),
    3: ("Scheduling", "Điều khiển Pod chạy ở node nào, static pod, bảo trì node."),
    4: ("Services & Networking", "Service, LoadBalancer, DNS, NetworkPolicy, Ingress và Gateway API."),
    5: ("Storage", "Volume, PV/PVC, StorageClass và StatefulSet."),
    6: ("Bảo mật", "RBAC, ServiceAccount, user và chứng chỉ, Pod Security."),
    7: ("Vận hành cluster", "Helm, Kustomize, CRD, operator, runtime, CNI, etcd, nâng cấp, chứng chỉ, HA."),
    8: ("Troubleshooting", "Chẩn đoán và sửa ứng dụng, mạng, control plane và node."),
    9: ("Thi thử", "Hai đề tổng hợp 2 giờ theo trọng số đề thi thật, làm theo từng host."),
}
# Scaffolding fades as the learner progresses: full walkthrough → approach per task → method only
SUPPORT = {
    "guided": ("Hướng dẫn từng bước", "Cầm tay chỉ việc",
               "Mỗi bước có lệnh, giải thích vì sao và kết quả bạn sẽ thấy. Lần đầu làm theo từng bước; lần hai đóng phần hướng dẫn lại và tự làm đề bài."),
    "scaffold": ("Cách tiếp cận", "Dẫn hướng",
                 "Mỗi câu chỉ ra chỗ tra tài liệu, khung lệnh và cách tự kiểm, nhưng không đưa đáp án. Hãy thử tự làm trước, kẹt mới mở."),
    "solo": ("Quy trình tư duy", "Tự lực",
             "Đề bài kiểu phòng thi. Phần này chỉ đưa quy trình làm việc và cách kiểm chứng; chi tiết bạn tự tra như trong phòng thi."),
}


def support_of(level):
    return "guided" if level <= 2 else "scaffold" if level <= 6 else "solo"


# Labs to finish first (what each lab builds on)
PREREQ = {
    1: [0], 2: [0], 3: [2], 4: [3], 5: [4], 6: [5], 7: [5], 8: [3, 7], 9: [5], 10: [5], 11: [10],
    12: [5, 9], 13: [12], 14: [12], 15: [5], 16: [15], 17: [15, 16], 18: [15], 19: [18],
    20: [6, 8], 21: [20], 22: [21], 23: [2], 24: [23], 25: [7, 23],
    26: [5], 27: [6, 26], 28: [4], 29: [14], 30: [1, 14], 31: [29], 32: [30],
    33: [7, 10], 34: [16, 17], 35: [31], 36: [14], 37: [11, 33], 38: list(range(2, 38)),
    39: [14], 40: [1, 17], 41: [26], 42: [28], 43: [15], 44: [18, 19],
    45: [38] + list(range(39, 45)),
}

ENV_TEXT = {"any": "kind hoặc kubeadm", "kind": "kind hoặc kubeadm (cần vào node)", "vm": "kubeadm trên máy ảo"}

HEADER = """#!/usr/bin/env bash
# Lab {id:02d} · {title}
# File sinh tự động từ {src}. Sửa file nguồn rồi chạy: python3 tools/build.py
set -uo pipefail
source "$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)/{rel}lib/common.sh"
"""


def md(text):
    return markdown.markdown(text or "", extensions=["fenced_code", "tables", "sane_lists"])


def sections(path):
    """Split a markdown file on '### ' headings → [(title, body)]."""
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        text = f.read()
    out = []
    for chunk in re.split(r"^### ", text, flags=re.M)[1:]:
        title, _, body = chunk.partition("\n")
        out.append((title.strip(), body.strip()))
    return out


def load():
    labs = []
    for path in sorted(glob.glob(os.path.join(ROOT, "src", "labs", "*.yaml"))):
        with open(path, encoding="utf-8") as f:
            for lab in yaml.safe_load(f) or []:
                lab["_src"] = os.path.relpath(path, ROOT)
                labs.append(lab)
    # learning order: by level, then id (ids stay stable when labs are added later)
    labs.sort(key=lambda x: (x["level"], x["id"]))
    ids = [l["id"] for l in labs]
    if len(ids) != len(set(ids)):
        sys.exit("duplicate lab ids")
    for l in labs:
        l.setdefault("env", "any")
        l.setdefault("hints", [])
        l.setdefault("docs", [])
        l["docs"] = [[", ".join(str(p) for p in d[:-1]), d[-1]] for d in l["docs"]]
        l.setdefault("tasks", [])
        l["support"] = support_of(l["level"])
        l["prereq"] = PREREQ.get(l["id"], [])
        l["guide"] = sections(os.path.join(ROOT, "src", "guides", "%02d.md" % l["id"]))
        l["diagrams"] = sections(os.path.join(ROOT, "src", "diagrams", "%02d.md" % l["id"]))
        l["dir"] = "%02d-%s" % (l["id"], l["slug"])
        for c in l.get("competencies", []):
            d, i = c.split(":")
            assert d in DOMAINS and int(i) < len(DOMAINS[d][2]), (l["id"], c)
    return labs


def write(path, text, exe=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    if exe:
        os.chmod(path, os.stat(path).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def comp_names(l):
    out = []
    for c in l.get("competencies", []):
        d, i = c.split(":")
        out.append("%s › %s" % (DOMAINS[d][0].split(",")[0], DOMAINS[d][2][int(i)]))
    return out


by_id = {}


def lab_readme(l, prev, nxt):
    lines = ["# Lab %02d · %s" % (l["id"], l["title"]), ""]
    lines.append("**Cấp độ %d · %s** · khoảng %d phút · môi trường: %s" % (
        l["level"], LEVELS[l["level"]][0], l.get("minutes", 20), ENV_TEXT[l["env"]]))
    if l.get("competencies"):
        lines.append("")
        lines.append("Năng lực CKA: " + "; ".join(comp_names(l)))
    sup = SUPPORT[l["support"]]
    lines += ["", "Mức hỗ trợ: **%s**. %s" % (sup[1], sup[2])]
    lines += ["", "## Mục tiêu", "", l["goal"].strip(), ""]
    if l["prereq"]:
        lines += ["## Cần làm trước", ""]
        if len(l["prereq"]) > 6:
            lines += ["Mọi lab từ %02d tới %02d." % (l["prereq"][0], l["prereq"][-1]), ""]
        else:
            for pid in l["prereq"]:
                p = by_id[pid]
                lines.append("- [Lab %02d · %s](../%s/README.md)" % (p["id"], p["title"], p["dir"]))
            lines.append("")
    if l.get("concepts"):
        lines += ["## Kiến thức cần nắm", "", l["concepts"].strip(), ""]
    if l["diagrams"]:
        lines += ["## Sơ đồ", ""]
        for t, b in l["diagrams"]:
            lines += ["### " + t, "", b, ""]
    lines += ["## Chuẩn bị", "", "```bash", "./lab start %d" % l["id"], "```", ""]
    if l.get("setup_note"):
        lines += [l["setup_note"].strip(), ""]
    lines += ["## Đề bài", ""]
    for i, t in enumerate(l["tasks"], 1):
        body = t.strip().replace("\n", "\n   ")
        lines.append("%d. %s" % (i, body))
        lines.append("")
    if l["guide"]:
        lines += ["## " + sup[0], ""]
        for k, (t, b) in enumerate(l["guide"], 1):
            head = "### Bước %d · %s" % (k, t) if l["support"] == "guided" else "### " + t
            lines += [head, "", b, ""]
    if l["hints"]:
        lines += ["## Gợi ý", ""]
        for h in l["hints"]:
            lines += ["<details><summary>%s</summary>" % html.escape(h.split("\n")[0].strip()), ""]
            rest = "\n".join(h.split("\n")[1:]).strip()
            if rest:
                lines += [rest, ""]
            lines += ["</details>", ""]
    lines += ["## Chấm bài", "", "```bash", "./lab check %d" % l["id"], "```", ""]
    lines += ["Lời giải: [SOLUTION.md](SOLUTION.md) (chỉ mở sau khi đã tự làm).", ""]
    lines += ["## Dọn dẹp", "", "```bash", "./lab reset %d" % l["id"], "```", ""]
    if l["docs"]:
        lines += ["## Tài liệu", ""]
        for t, u in l["docs"]:
            lines.append("- [%s](%s)" % (t, u))
        lines.append("")
    nav = []
    if prev:
        nav.append("← [Lab %02d · %s](../%s/README.md)" % (prev["id"], prev["title"], prev["dir"]))
    if nxt:
        nav.append("[Lab %02d · %s](../%s/README.md) →" % (nxt["id"], nxt["title"], nxt["dir"]))
    lines += ["---", "", " · ".join(nav), ""]
    return "\n".join(lines)


def main():
    labs = load()
    by_id.update({l["id"]: l for l in labs})
    # clean generated dirs
    for d in glob.glob(os.path.join(ROOT, "labs", "*")):
        shutil.rmtree(d)
    sol_dir = os.path.join(ROOT, "tests", "solutions")
    shutil.rmtree(sol_dir, ignore_errors=True)
    tested = []
    for k, l in enumerate(labs):
        prev = labs[k - 1] if k else None
        nxt = labs[k + 1] if k + 1 < len(labs) else None
        base = os.path.join(ROOT, "labs", l["dir"])
        hdr = HEADER.format(id=l["id"], title=l["title"], src=l["_src"], rel="../../")
        envline = 'require_env %s\ndetect_nodes\n' % l["env"]
        write(os.path.join(base, "README.md"), lab_readme(l, prev, nxt))
        write(os.path.join(base, "SOLUTION.md"), "# Lời giải · Lab %02d · %s\n\n%s\n" % (l["id"], l["title"], l["solution"].strip()))
        write(os.path.join(base, "setup.sh"), hdr + envline + (l.get("setup") or "").rstrip() + "\necho \"✔ Đã dựng xong tình huống.\"\n", True)
        write(os.path.join(base, "verify.sh"), hdr + "exec 2>/dev/null\ndetect_nodes\nbegin_verify %02d %s\n" % (l["id"], json.dumps(l["title"], ensure_ascii=False)) + (l.get("verify") or "").rstrip() + "\nend_verify\n", True)
        write(os.path.join(base, "cleanup.sh"), hdr + "detect_nodes\n" + (l.get("cleanup") or "").rstrip() + "\n", True)
        write(os.path.join(base, ".meta"), 'ID=%02d\nLEVEL=%d\nENV=%s\nTITLE=%s\n' % (l["id"], l["level"], l["env"], json.dumps(l["title"], ensure_ascii=False)))
        if l.get("solve"):
            write(os.path.join(sol_dir, "%02d.sh" % l["id"]),
                  HEADER.format(id=l["id"], title=l["title"], src=l["_src"], rel="../../") + "detect_nodes\nset -e\n" + l["solve"].rstrip() + "\n", True)
        if l.get("test", True) is True and l.get("solve"):
            tested.append("%02d" % l["id"])
    write(os.path.join(ROOT, "tests", "labs.txt"), "\n".join(tested) + "\n")

    # README lab table
    rows = ["| Lab | Bài | Cấp độ | Môi trường | Thời gian |", "|---|---|---|---|---|"]
    for l in labs:
        rows.append("| %02d | [%s](labs/%s/README.md) | %d · %s | %s | %d′ |" % (
            l["id"], l["title"], l["dir"], l["level"], LEVELS[l["level"]][0], ENV_TEXT[l["env"]], l.get("minutes", 20)))
    cov = ["| Domain | Năng lực | Lab |", "|---|---|---|"]
    for dk, (dn, w, items) in DOMAINS.items():
        for i, it in enumerate(items):
            ls = [("%02d" % l["id"]) for l in labs if "%s:%d" % (dk, i) in l.get("competencies", [])]
            cov.append("| %s %d%% | %s | %s |" % (dn.split(",")[0], w, it, ", ".join(ls) or "—"))
    rpath = os.path.join(ROOT, "README.md")
    with open(rpath, encoding="utf-8") as f:
        readme = f.read()
    readme = re.sub(r"<!-- LABS:START -->.*<!-- LABS:END -->", "<!-- LABS:START -->\n" + "\n".join(rows) + "\n<!-- LABS:END -->", readme, flags=re.S)
    readme = re.sub(r"<!-- COVERAGE:START -->.*<!-- COVERAGE:END -->", "<!-- COVERAGE:START -->\n" + "\n".join(cov) + "\n<!-- COVERAGE:END -->", readme, flags=re.S)
    write(rpath, readme)

    # HTML guide
    data = {
        "levels": {str(k): v for k, v in LEVELS.items()},
        "support": SUPPORT,
        "domains": {k: [v[0], v[1], v[2]] for k, v in DOMAINS.items()},
        "env": ENV_TEXT,
        "labs": [{
            "id": l["id"], "slug": l["slug"], "dir": l["dir"], "title": l["title"], "level": l["level"],
            "env": l["env"], "minutes": l.get("minutes", 20), "comps": l.get("competencies", []),
            "goal": md(l["goal"]), "concepts": md(l.get("concepts", "")),
            "setup_note": md(l.get("setup_note", "")),
            "tasks": [md(t) for t in l["tasks"]],
            "hints": [[h.split("\n")[0].strip(), md("\n".join(h.split("\n")[1:]))] for h in l["hints"]],
            "solution": md(l["solution"]), "docs": l["docs"],
            "support": l["support"], "prereq": l["prereq"],
            "guide": [[t, md(b)] for t, b in l["guide"]],
            "diagrams": [[t, md(b)] for t, b in l["diagrams"]],
        } for l in labs],
    }
    with open(os.path.join(ROOT, "tools", "guide.html"), encoding="utf-8") as f:
        tpl = f.read()
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    page = tpl.replace("/*__DATA__*/null", blob)
    # artifact version (the host adds the document skeleton)
    write(os.path.join(ROOT, "build", "guide.html"), page)
    # standalone version for GitHub Pages
    head, body = page.split("</style>", 1)
    full = ('<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + head + "[hidden]{display:none!important}\n</style>\n</head>\n<body>\n" + body + "\n</body>\n</html>\n")
    write(os.path.join(ROOT, "docs", "index.html"), full)

    # theory page (interactive concepts), served next to the guide as learn.html
    with open(os.path.join(ROOT, "tools", "learn.html"), encoding="utf-8") as f:
        learn = f.read()
    # extra views: workload resources, best practices (example files come from examples/web-api)
    ex = os.path.join(ROOT, "examples", "web-api")
    best_files = {}
    for dp, _, fs in os.walk(ex):
        for fn in sorted(fs):
            fp = os.path.join(dp, fn)
            with open(fp, encoding="utf-8") as f:
                best_files[os.path.relpath(fp, ex).replace(os.sep, "/")] = f.read()
    js = "const BEST_FILES = " + json.dumps(best_files, ensure_ascii=False) + ";\n"
    for part in ("learn-kinds.js", "learn-best.js"):
        with open(os.path.join(ROOT, "tools", part), encoding="utf-8") as f:
            js += f.read() + "\n"
    learn += "\n<script>\n\"use strict\";\n" + js.replace("</script", "<\\/script").replace("</SCRIPT", "<\\/SCRIPT") + "\n</script>\n"
    lhead, lbody = learn.split("</style>", 1)
    learn_full = ('<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n'
                  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                  + lhead + "[hidden]{display:none!important}\n</style>\n</head>\n<body>\n" + lbody + "\n</body>\n</html>\n")
    write(os.path.join(ROOT, "docs", "learn.html"), learn_full)
    write(os.path.join(ROOT, "build", "learn.html"), learn_full)
    print("built %d labs, %d in test suite" % (len(labs), len(tested)))


if __name__ == "__main__":
    main()
