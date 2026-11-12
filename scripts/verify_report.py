"""Check that every number in the report table and figure data equals paired.json.

Usage: python scripts/verify_report.py   (exit code 1 on any mismatch)
"""
from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REP = ROOT / "report"
paired = json.loads((ROOT / "web/public/data/paired.json").read_text())
idx = {(p["first"], p["second"]): i for i, p in enumerate(paired["pairs"])}
NAME = {"adaptive_bee": "Adaptive BEE (A6)", "plain_ppo": "Plain PPO", "fixed_bee": "Fixed BEE (F2)"}
fails: list[str] = []
n = 0


def same(a: float, b: float, what: str, tol: float = 0.0) -> None:
    global n
    n += 1
    if abs(float(a) - float(b)) > tol:
        fails.append(f"{what}: {a} != {b}")


# CSV: exact values
with (REP / "table_D_paired.csv").open() as fh:
    rows = list(csv.DictReader(fh))
for r in rows:
    key = next(k for k in idx if f"{NAME[k[0]]} minus {NAME[k[1]]}" == r["pair"])
    p = paired["pairs"][idx[key]]
    pm = p["metrics"][r["metric"]]
    for f in pm["per_fold"]:
        same(r[f["test_week"]], f["difference"], f"csv {r['pair']} {r['metric']} {f['test_week']}")
    for k in ["mean_difference", "folds_first_better", "folds_equal", "min_difference", "max_difference"]:
        same(r[k], pm[k], f"csv {r['pair']} {r['metric']} {k}")
    same(r["bootstrap_low"], pm["bootstrap_95_interval"][0], f"csv {r['metric']} bootstrap_low")
    same(r["bootstrap_high"], pm["bootstrap_95_interval"][1], f"csv {r['metric']} bootstrap_high")
    same(r["w50_seed_band_half_width"], p["scale"]["metrics"][r["metric"]]["band_half_width"], f"csv {r['metric']} band")
    if r["bootstrap_note"] != "n = 5 folds, indicative only":
        fails.append("csv bootstrap note missing")
    if key[1] == "fixed_bee" and r["note"] != "N4":
        fails.append("csv N4 note missing on adaptive minus fixed")

# Markdown table: every number equals paired.json at the printed precision
md = (REP / "table_D_paired.md").read_text()
if "[N4]" not in md:
    fails.append("markdown table has no N4 footnote")
md_rows = [l for l in md.splitlines() if l.startswith("| Adaptive")]
for line, r in zip(md_rows, rows):
    cells = [c.strip() for c in line.strip("|").split("|")]
    nums = [float(x.replace("−", "-")) for x in re.findall(r"[+\-±]?\d+\.\d+", " ".join(cells[2:]).replace("±", ""))]
    want = [float(r[w]) for w in ["W10", "W20", "W30", "W40", "W50"]] + [float(r["mean_difference"]), float(r["min_difference"]), float(r["max_difference"]),
                                                                          float(r["bootstrap_low"]), float(r["bootstrap_high"]), float(r["w50_seed_band_half_width"])]
    d = 2 if r["metric"] in ("unmet_hours", "runtime_seconds") else 4
    if len(nums) != len(want):
        fails.append(f"markdown row {r['pair']} {r['metric']}: {len(nums)} numbers, expected {len(want)}")
    for a, b in zip(nums, want):
        same(a, b, f"md {r['pair']} {r['metric']}", tol=0.5 * 10 ** -d + 1e-12)

# Figure data: exact values
for stem, key in [("figure_D1_adaptive_vs_plain", ("adaptive_bee", "plain_ppo")), ("figure_D2_adaptive_vs_fixed", ("adaptive_bee", "fixed_bee"))]:
    data = json.loads((REP / f"{stem}_data.json").read_text())
    p = paired["pairs"][idx[key]]
    if data["pair_index"] != idx[key]:
        fails.append(f"{stem}: wrong pair index")
    for m, d in data["metrics"].items():
        pm = p["metrics"][m]
        for f in pm["per_fold"]:
            same(d["per_fold"][f["test_week"]], f["difference"], f"{stem} {m} {f['test_week']}")
        same(d["mean_difference"], pm["mean_difference"], f"{stem} {m} mean")
        same(d["bootstrap_95_interval"][0], pm["bootstrap_95_interval"][0], f"{stem} {m} boot low")
        same(d["bootstrap_95_interval"][1], pm["bootstrap_95_interval"][1], f"{stem} {m} boot high")
        same(d["band_half_width"], p["scale"]["metrics"][m]["band_half_width"], f"{stem} {m} band")
        same(d["folds_first_better"], pm["folds_first_better"], f"{stem} {m} folds better")
    for ext in (".svg", ".png"):
        if not (REP / f"{stem}{ext}").exists():
            fails.append(f"missing {stem}{ext}")

# Captions: wording rules and numbers
cap = (REP / "captions.md").read_text()
if re.search(r"\b(improv\w*|outperform\w*|significant\w*|wins?|beats?|superior)\b", cap, re.I) and "No significance test was run" not in cap:
    fails.append("captions use a banned word")
banned = re.sub(r"No significance test was run\.", "", cap)
if re.search(r"\b(improv\w*|outperform\w*|significan\w*|wins?|beats?|superior)\b", banned, re.I):
    fails.append("captions use a banned word")
for key, num in [(("adaptive_bee", "plain_ppo"), "D1"), (("adaptive_bee", "fixed_bee"), "D2")]:
    pm = paired["pairs"][idx[key]]["metrics"]["duration_fulfillment"]
    band = paired["pairs"][idx[key]]["scale"]["metrics"]["duration_fulfillment"]["band_half_width"]
    block = cap.split(f"**Figure {num}.**")[1].split("**")[0]
    if f"{abs(pm['mean_difference']):.4f}" not in block or f"{band:.4f}" not in block or "n = 5 folds" not in block:
        fails.append(f"caption {num}: numbers do not match paired.json")
if "N4" not in cap.split("**Figure D2.**")[1]:
    fails.append("caption D2 has no N4 note")

print(f"report values checked against paired.json: {n}")
if fails:
    print(f"VERIFY REPORT FAILED ({len(fails)}):")
    print("\n".join(fails[:40]))
    sys.exit(1)
print("VERIFY REPORT PASSED: table, figure data and captions match paired.json.")
