"""Record requested and actual training timesteps from final model zips (read-only).

Opens each Stable-Baselines3 zip in incoming/ and reads `num_timesteps` and
`_total_timesteps` from its `data` entry. Nothing in incoming/ is written.
Output: data/derived/model_timesteps.csv
"""
from __future__ import annotations

import csv
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INC = ROOT / "incoming"

MODELS = (
    [("plain_ppo", p, re.search(r"fold_(\d)_train_seed_(\d+)", p.name))
     for p in sorted((INC / "member2_plain_ppo/plain_ppo_cross_week_models").glob("fold_*_train_seed_*.zip"))]
    + [("fixed_bee", p, re.search(r"fold_(\d)_seed_(\d+)", p.name))
       for p in sorted((INC / "member3_fixed_be/fixed_bee_models").glob("fixed_F2_fold_*_seed_*.zip"))]
)


def read(p: Path) -> tuple[int | None, int | None]:
    with zipfile.ZipFile(p) as z:
        d = z.read("data").decode()
    n = re.search(r'"num_timesteps":\s*(\d+)', d)
    t = re.search(r'"_total_timesteps":\s*(\d+)', d)
    return (int(n.group(1)) if n else None, int(t.group(1)) if t else None)


def main() -> None:
    out = ROOT / "data/derived/model_timesteps.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["method", "fold", "training_seed", "num_timesteps", "total_timesteps_requested", "source"])
        for method, p, m in MODELS:
            n, t = read(p)
            w.writerow([method, m.group(1), m.group(2), n, t, str(p.relative_to(ROOT))])
    print(f"wrote {out.relative_to(ROOT)} ({len(MODELS)} models)")


if __name__ == "__main__":
    main()
