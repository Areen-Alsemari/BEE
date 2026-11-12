"""Report deliverables for the adaptive BEE (member 4) section.

Reads only web/public/data/paired.json and web/public/data/results_summary.json and writes report/:
  table_D_paired.csv, table_D_paired.md        adaptive minus plain PPO and adaptive minus fixed BEE, six metrics
  figure_D1_adaptive_vs_plain.svg/.png          per-fold differences, mean, bootstrap interval, W50 seed-spread band
  figure_D2_adaptive_vs_fixed.svg/.png
  figure_D1_data.json, figure_D2_data.json      the exact numbers plotted (checked by scripts/verify_report.py)
  captions.md

Colours, marker shapes and wording follow the lab (web/src/config/theme.ts).
Usage: python scripts/make_report_figures.py
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import matplotlib.ticker  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "web/public/data"
OUT = ROOT / "report"

METRICS = ["duration_fulfillment", "minimum_satisfaction_rate", "full_satisfaction_rate", "unmet_hours", "mission_fairness", "runtime_seconds"]
LABEL = {
    "duration_fulfillment": "Duration fulfillment",
    "minimum_satisfaction_rate": "Minimum satisfaction",
    "full_satisfaction_rate": "Full satisfaction",
    "unmet_hours": "Unmet hours",
    "mission_fairness": "Mission fairness",
    "runtime_seconds": "Runtime (s)",
}
LOWER_BETTER = {"unmet_hours", "runtime_seconds"}
NAME = {"adaptive_bee": "Adaptive BEE (A6)", "plain_ppo": "Plain PPO", "fixed_bee": "Fixed BEE (F2)"}
# same as web/src/config/theme.ts
COLOR = {"adaptive_bee": "#a23f9c", "plain_ppo": "#b84e00", "fixed_bee": "#00805c"}
MARKER = {"adaptive_bee": "D", "plain_ppo": "o", "fixed_bee": "^"}
NAVY, BLUE, FG, MUTED = "#183078", "#2c5aa0", "#0e1b3d", "#4a5675"
BOOT_NOTE = "n = 5 folds, indicative only"
N4 = (
    "N4 (awaiting owner confirmation): fixed BEE (F2) and adaptive BEE differ in stimulus weights (0.5/0.3/0.2 vs 0.4/0.4/0.2), "
    "in the contention definition (static min-max over training weeks vs dynamic competitors / valid actions) and in the "
    "activation formula details, so adaptive minus fixed BEE is not an isolated effect of the threshold rule."
)


def digits(m: str) -> int:
    return 2 if m in LOWER_BETTER else 4


def fmt(m: str, v: float) -> str:
    return f"{v:+.{digits(m)}f}"


def load():
    paired = json.loads((DATA / "paired.json").read_text())
    summary = json.loads((DATA / "results_summary.json").read_text())
    idx = {(p["first"], p["second"]): i for i, p in enumerate(paired["pairs"])}
    return paired, summary, idx


def table(paired, idx):
    rows = []
    for key in [("adaptive_bee", "plain_ppo"), ("adaptive_bee", "fixed_bee")]:
        p = paired["pairs"][idx[key]]
        for m in METRICS:
            pm = p["metrics"][m]
            rows.append({
                "pair": f"{NAME[key[0]]} minus {NAME[key[1]]}",
                "metric": m,
                "direction": pm["direction"],
                **{f["test_week"]: f["difference"] for f in pm["per_fold"]},
                "mean_difference": pm["mean_difference"],
                "folds_first_better": pm["folds_first_better"],
                "folds_equal": pm["folds_equal"],
                "min_difference": pm["min_difference"],
                "max_difference": pm["max_difference"],
                "bootstrap_low": pm["bootstrap_95_interval"][0],
                "bootstrap_high": pm["bootstrap_95_interval"][1],
                "bootstrap_note": BOOT_NOTE,
                "w50_seed_band_half_width": p["scale"]["metrics"][m]["band_half_width"],
                "note": "N4" if key[1] == "fixed_bee" else "",
            })
    header = list(rows[0].keys())
    with (OUT / "table_D_paired.csv").open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=header)
        w.writeheader()
        w.writerows(rows)

    weeks = ["W10", "W20", "W30", "W40", "W50"]
    md = [
        "# Table D. Paired per-fold differences, adaptive BEE (A6)",
        "",
        "Difference = first method minus second, per fold (test week), after averaging over evaluation seeds and then training seeds; "
        "folds 1-4 use training seed 42 and W50 uses training seeds 42, 123 and 456. \"Folds better\" counts folds where the first "
        "method is better (higher, or lower for unmet hours and runtime). Bootstrap interval over folds: " + BOOT_NOTE + ". "
        "Seed band: the larger W50 seed SD of the two methods, for scale.",
        "",
        "| Pair | Metric | " + " | ".join(weeks) + " | Mean | Folds better | Min | Max | Bootstrap interval | Seed band |",
        "|---|---|" + "---:|" * 5 + "---:|---:|---:|---:|---|---:|",
    ]
    for r in rows:
        m = r["metric"]
        pair = r["pair"] + (" [N4]" if r["note"] else "")
        md.append(
            f"| {pair} | {LABEL[m]} | " + " | ".join(fmt(m, r[w]) for w in weeks)
            + f" | {fmt(m, r['mean_difference'])} | {r['folds_first_better']} of 5 | {fmt(m, r['min_difference'])} | {fmt(m, r['max_difference'])}"
            + f" | {fmt(m, r['bootstrap_low'])} to {fmt(m, r['bootstrap_high'])} ({BOOT_NOTE}) | ±{r['w50_seed_band_half_width']:.{digits(m)}f} |"
        )
    md += ["", f"[N4] {N4}", "", "Source: web/public/data/paired.json (exported by scripts/export_data.py, verified by scripts/verify_export.py)."]
    (OUT / "table_D_paired.md").write_text("\n".join(md) + "\n")
    return rows


def figure(paired, idx, key, stem):
    p = paired["pairs"][idx[key]]
    first, second = key
    data = {"pair_index": idx[key], "pair": p["label"], "metrics": {}}
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 9, "axes.edgecolor": "#8d9ab5", "axes.labelcolor": FG, "xtick.color": MUTED, "ytick.color": MUTED})
    fig, axes = plt.subplots(2, 3, figsize=(7.2, 4.9), facecolor="white")
    weeks = [f["test_week"] for f in p["metrics"]["duration_fulfillment"]["per_fold"]]
    for ax, m in zip(axes.flat, METRICS):
        pm = p["metrics"][m]
        band = p["scale"]["metrics"][m]["band_half_width"]
        diffs = [f["difference"] for f in pm["per_fold"]]
        lo, hi = pm["bootstrap_95_interval"]
        ext = max([band, abs(lo), abs(hi)] + [abs(d) for d in diffs]) * 1.25
        ax.axvspan(-band, band, color=BLUE, alpha=0.12, lw=0, label="W50 seed spread")
        ax.axvline(0, color=FG, lw=0.9)
        ys = [5, 4, 3, 2, 1]
        ax.scatter(diffs, ys, marker=MARKER[first], s=34, color=COLOR[first], edgecolor=FG, linewidth=0.5, zorder=3)
        ax.axvline(pm["mean_difference"], color=COLOR[first], lw=1.6, ls=(0, (5, 2)), zorder=2)
        ax.plot([lo, hi], [0.2, 0.2], color=FG, lw=1.6)
        ax.plot([lo, lo], [0.05, 0.35], color=FG, lw=1.6)
        ax.plot([hi, hi], [0.05, 0.35], color=FG, lw=1.6)
        ax.set_xlim(-ext, ext)
        ax.set_ylim(-0.3, 5.7)
        ax.set_yticks(ys + [0.2])
        ax.set_yticklabels(weeks + ["boot."], fontsize=8)
        ax.set_title(LABEL[m] + (" (lower is better)" if m in LOWER_BETTER else ""), fontsize=9, color=FG, loc="left")
        ax.tick_params(axis="x", labelsize=7.5)
        ax.xaxis.set_major_locator(matplotlib.ticker.MaxNLocator(4, symmetric=True))
        for s in ("top", "right"):
            ax.spines[s].set_visible(False)
        data["metrics"][m] = {
            "per_fold": {w: d for w, d in zip(weeks, diffs)},
            "mean_difference": pm["mean_difference"],
            "bootstrap_95_interval": [lo, hi],
            "band_half_width": band,
            "folds_first_better": pm["folds_first_better"],
        }
    fig.suptitle(f"{NAME[first]} minus {NAME[second]}: per-fold differences", x=0.01, ha="left", fontsize=10.5, color=NAVY, fontweight="bold")
    foot = (f"Markers: the five folds. Dashed line: mean. Bar: bootstrap interval ({BOOT_NOTE}).\n"
            "Shaded: ± the larger W50 seed SD of the two methods, for scale.")
    if second == "fixed_bee":
        foot += "\nN4: the two BEE streams also differ in stimulus weights, contention and activation details; not an isolated threshold effect."
    fig.text(0.01, 0.005, foot, fontsize=7.5, color=MUTED, ha="left", va="bottom", linespacing=1.4)
    fig.tight_layout(rect=(0, 0.075 if second == "fixed_bee" else 0.055, 1, 0.95))
    fig.savefig(OUT / f"{stem}.svg")
    fig.savefig(OUT / f"{stem}.png", dpi=300)
    plt.close(fig)
    (OUT / f"{stem}_data.json").write_text(json.dumps(data, indent=2))
    return data


def captions(paired, idx, summary):
    lines = ["# Figure captions", ""]
    for key, stem, num in [(("adaptive_bee", "plain_ppo"), "figure_D1_adaptive_vs_plain", "D1"), (("adaptive_bee", "fixed_bee"), "figure_D2_adaptive_vs_fixed", "D2")]:
        p = paired["pairs"][idx[key]]
        pm = p["metrics"]["duration_fulfillment"]
        band = p["scale"]["metrics"]["duration_fulfillment"]["band_half_width"]
        rel = "within" if abs(pm["mean_difference"]) <= band else "larger than"
        direction = "lower" if pm["mean_difference"] < 0 else "higher"
        cap = (
            f"**Figure {num}.** {NAME[key[0]]} minus {NAME[key[1]]}, per-fold differences for six metrics (n = 5 folds: W10 to W50). "
            f"Each marker is one test week, after averaging over evaluation seeds and then training seeds (training seed 42 on folds 1-4; "
            f"42, 123 and 456 on W50). For duration fulfillment the mean difference is {direction} by {abs(pm['mean_difference']):.4f}, "
            f"with the first method higher in {pm['folds_first_better']} of 5 folds; this is {rel} the W50 seed spread "
            f"(±{band:.4f}, shaded). The bar is a bootstrap interval over folds ({BOOT_NOTE}). No significance test was run."
        )
        if key[1] == "fixed_bee":
            cap += " " + N4
        lines += [cap, f"Files: report/{stem}.svg, report/{stem}.png (300 dpi).", ""]
    lines += [
        "**Table D.** Paired per-fold differences for adaptive BEE (A6) against plain PPO and against fixed BEE, six metrics, "
        f"with mean, folds better, range, bootstrap interval ({BOOT_NOTE}) and the W50 seed band for scale. File: report/table_D_paired.md "
        "(and .csv).",
        "",
    ]
    (OUT / "captions.md").write_text("\n".join(lines))


def main():
    OUT.mkdir(exist_ok=True)
    paired, summary, idx = load()
    table(paired, idx)
    figure(paired, idx, ("adaptive_bee", "plain_ppo"), "figure_D1_adaptive_vs_plain")
    figure(paired, idx, ("adaptive_bee", "fixed_bee"), "figure_D2_adaptive_vs_fixed")
    captions(paired, idx, summary)
    print("wrote", ", ".join(sorted(p.name for p in OUT.iterdir())))


if __name__ == "__main__":
    main()
