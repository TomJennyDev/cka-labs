#!/usr/bin/env python3
"""Render every Mermaid block in src/diagrams/*.md with mmdc to catch syntax errors.

    npm i -g @mermaid-js/mermaid-cli   # once
    python3 tools/check_diagrams.py [NN ...]
"""
import glob, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
want = set(a.zfill(2) for a in sys.argv[1:])
bad = 0
with tempfile.TemporaryDirectory() as tmp:
    for path in sorted(glob.glob(os.path.join(ROOT, "src", "diagrams", "*.md"))):
        nn = os.path.basename(path)[:2]
        if want and nn not in want:
            continue
        blocks = re.findall(r"```mermaid\n(.*?)```", open(path, encoding="utf-8").read(), re.S)
        for i, b in enumerate(blocks):
            src = os.path.join(tmp, "%s-%d.mmd" % (nn, i))
            open(src, "w", encoding="utf-8").write(b)
            r = subprocess.run(["mmdc", "-q", "-i", src, "-o", src + ".svg"], capture_output=True, text=True)
            if r.returncode != 0:
                bad += 1
                msg = (r.stderr or r.stdout).strip().splitlines()
                print("✘ %s #%d: %s" % (nn, i + 1, " | ".join(msg[:4])))
            else:
                print("✔ %s #%d" % (nn, i + 1))
sys.exit(1 if bad else 0)
