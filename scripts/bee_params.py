"""Read the BEE feature definitions and parameters from the code and configuration files.

Nothing here is typed in by hand: every value is parsed from a source file (Python source via
`ast`, notebook cells via `ast`, JSON configuration files via `json`), and every reference records
the file, notebook cell and line, plus the exact text of that line. The builder fails loudly if an
expected line or value cannot be found, so a change in the source cannot go unnoticed.

Used by scripts/export_data.py to write web/public/data/bee_params.json and
docs/BEE_MECHANISM_NOTES.md.
"""
from __future__ import annotations

import ast
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHARED_ENV = ROOT / "shared/src/environment.py"
M4_FIXED = ROOT / "notebooks/04_adaptive_bee/src/bee_fixed_environment.py"
M4_ADAPT = ROOT / "notebooks/04_adaptive_bee/src/bee_adaptive_environment.py"
M3_NB = ROOT / "notebooks/03_fixed_bee/03_fixed_threshold_bee.ipynb"
A6_CFG = ROOT / "data/results/adaptive_bee_configuration.json"
A3_CFG = ROOT / "data/results/adaptive_bee_a3_first_pass_configuration.json"
F_CFG = ROOT / "data/results/fixed_bee_configuration.json"


class SourceError(Exception):
    pass


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT))


# ------------------------------------------------------------------ locating lines
def py_lines(path: Path) -> list[str]:
    return path.read_text().splitlines()


def find_py(path: Path, pattern: str, after: int = 0) -> dict:
    rx = re.compile(pattern)
    for i, line in enumerate(py_lines(path), 1):
        if i > after and rx.search(line):
            return {"file": rel(path), "line": i, "text": line.strip()}
    raise SourceError(f"{rel(path)}: no line matches {pattern!r}")


def py_range(path: Path, start_pattern: str, end_pattern: str) -> dict:
    a = find_py(path, start_pattern)
    b = find_py(path, end_pattern, after=a["line"])
    return {"file": rel(path), "lines": [a["line"], b["line"]], "text": a["text"], "end_text": b["text"]}


def nb_cells() -> list[dict]:
    return json.loads(M3_NB.read_text())["cells"]


def find_nb(pattern: str, cell: int | None = None) -> dict:
    rx = re.compile(pattern)
    for ci, c in enumerate(nb_cells()):
        if c["cell_type"] != "code" or (cell is not None and ci != cell):
            continue
        for li, line in enumerate("".join(c["source"]).splitlines(), 1):
            if rx.search(line):
                return {"file": rel(M3_NB), "cell": ci, "line": li, "text": line.strip()}
    raise SourceError(f"{rel(M3_NB)}: no code line matches {pattern!r}")


def find_json_key(path: Path, key: str) -> dict:
    for i, line in enumerate(path.read_text().splitlines(), 1):
        if re.search(rf'"{re.escape(key)}"\s*:', line):
            return {"file": rel(path), "line": i, "text": line.strip()}
    raise SourceError(f"{rel(path)}: key {key!r} not found")


# ------------------------------------------------------------------ parsing values
def init_defaults(path: Path, cls: str) -> dict:
    tree = ast.parse(path.read_text())
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == cls:
            for f in node.body:
                if isinstance(f, ast.FunctionDef) and f.name == "__init__":
                    args = f.args.args[-len(f.args.defaults):]
                    return {a.arg: ast.literal_eval(d) for a, d in zip(args, f.args.defaults)}
    raise SourceError(f"{rel(path)}: class {cls} __init__ not found")


def nb_assignment(name: str):
    for ci, c in enumerate(nb_cells()):
        if c["cell_type"] != "code":
            continue
        src = "".join(c["source"])
        try:
            tree = ast.parse(src)
        except SyntaxError:
            continue
        for node in tree.body:
            if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
                return ast.literal_eval(node.value), ci, node.lineno
    raise SourceError(f"{rel(M3_NB)}: assignment {name} not found")


def nb_init_default(cls: str, arg: str):
    for ci, c in enumerate(nb_cells()):
        if c["cell_type"] != "code":
            continue
        src = "".join(c["source"])
        if f"class {cls}" not in src:
            continue
        for node in ast.walk(ast.parse(src)):
            if isinstance(node, ast.ClassDef) and node.name == cls:
                for f in node.body:
                    if isinstance(f, ast.FunctionDef) and f.name == "__init__":
                        args = f.args.args[-len(f.args.defaults):]
                        for a, d in zip(args, f.args.defaults):
                            if a.arg == arg:
                                return ast.literal_eval(d), ci, d.lineno
    raise SourceError(f"{rel(M3_NB)}: {cls}.__init__ default {arg} not found")


def with_ref(value, ref: dict) -> dict:
    return {"value": value, "source": ref}


# ------------------------------------------------------------------ builders
def mask_section() -> dict:
    return {
        "statement": "The BEE features are inputs to the policy. The action mask is the shared feasibility mask.",
        "shared_mask": py_range(SHARED_ENV, r"def _refresh_candidates_and_mask", r"def action_masks"),
        "mask_set_when_feasible": find_py(SHARED_ENV, r"self\._action_mask\[action\] = 1"),
        "action_masks": find_py(SHARED_ENV, r"def action_masks"),
        "adaptive_stream_fixed_env_calls_shared_mask": find_py(M4_FIXED, r"super\(\)\._refresh_candidates_and_mask"),
        "adaptive_stream_features_after_mask": find_py(M4_FIXED, r"self\._calculate_bee_features\(\)"),
        "fixed_stream_mask_unchanged_test": find_nb(r"assert np\.array_equal\(fixed_mask, base_mask\)"),
        "fixed_stream_features_in_observation": find_nb(r"def _get_observation"),
    }


def adaptive_section(cfg_path: Path, config_id: str) -> dict:
    cfg = json.loads(cfg_path.read_text())
    ap = cfg["adaptive_parameters"]
    if cfg["selected_configuration_id"] != config_id:
        raise SourceError(f"{rel(cfg_path)}: selected_configuration_id is {cfg['selected_configuration_id']}, expected {config_id}")
    defaults = init_defaults(M4_ADAPT, "BEEAdaptiveThresholdEnv")
    p = lambda k: with_ref(ap[k], find_json_key(cfg_path, k))  # noqa: E731
    w = ap["stimulus_weights"]
    return {
        "id": f"adaptive_{config_id}",
        "label": f"Adaptive BEE ({config_id})",
        "stream": "adaptive (member 4)",
        "environment": {"class": "BEEAdaptiveThresholdEnv", "source": find_py(M4_ADAPT, r"class BEEAdaptiveThresholdEnv")},
        "configuration_file": rel(cfg_path),
        "stimulus_weights": {
            "scarcity": w[0],
            "contention": w[1],
            "unmet": w[2],
            "source": find_json_key(cfg_path, "stimulus_weights"),
        },
        "definitions": {
            "placement_scarcity": {
                "words": "1 minus (current number of feasible placement candidates / number of candidates when the request was first seen this episode), clipped to [0, 1]",
                "source": find_py(M4_FIXED, r"placement_scarcity = np\.clip\(1\.0 - current_count / initial_count"),
            },
            "resource_contention": {
                "words": "dynamic: number of other currently valid requests that share at least one candidate antenna, divided by (number of valid requests - 1), capped at 1",
                "normalisation": "none beyond the division by (valid requests - 1); recomputed at every step",
                "source": find_py(M4_FIXED, r"contention\[action\] = min\(len\(competitors\) / denominator, 1\.0\)"),
                "denominator_source": find_py(M4_FIXED, r"denominator = max\(len\(valid_actions\) - 1, 1\)"),
            },
            "mission_unmet_ratio": {
                "words": "1 minus (seconds allocated so far to the request's mission / seconds requested by that mission this week), clipped to [0, 1]",
                "source": find_py(M4_FIXED, r"mission_unmet_ratio = np\.clip\(dynamic\[\"mission_unmet_ratio\"\], 0\.0, 1\.0\)"),
                "shared_definition": find_py(SHARED_ENV, r"1\.0 - subject_allocated / subject_requested"),
            },
            "contention_increase": {
                "words": "max(current contention - contention when the request was first seen this episode, 0)",
                "source": find_py(M4_ADAPT, r"contention_increase = max\(current_contention - initial_contention, 0\.0\)"),
            },
            "relative_unmet_pressure": {
                "words": "max(mission unmet ratio - mean unmet ratio over missions with requested time, 0)",
                "source": find_py(M4_ADAPT, r"relative_unmet_pressure = max\(bee\[\"mission_unmet_ratio\"\] - mean_mission_unmet, 0\.0\)"),
                "mean_source": find_py(M4_ADAPT, r"mission_ratios\.append\(1\.0 - allocated / requested\)"),
            },
        },
        "stimulus": {
            "formula": "clip(w_scarcity * scarcity + w_contention * contention + w_unmet * unmet, 0, 1)",
            "clip": [0.0, 1.0],
            "source": find_py(M4_FIXED, r"stimulus = np\.clip\("),
        },
        "threshold": {
            "kind": "adaptive",
            "base_threshold": p("base_threshold"),
            "scarcity_strength": p("scarcity_strength"),
            "contention_strength": p("contention_strength"),
            "unmet_strength": p("unmet_strength"),
            "minimum_threshold": p("minimum_threshold"),
            "maximum_threshold": p("maximum_threshold"),
            "formula": "clip(base - scarcity_strength*scarcity - contention_strength*contention_increase - unmet_strength*relative_unmet_pressure, minimum, maximum) when adaptation is enabled, else base",
            "formula_source": find_py(M4_ADAPT, r"self\.base_threshold - self\.scarcity_strength \* bee"),
            "not_enabled_source": find_py(M4_ADAPT, r"adaptive_threshold = \(self\.base_threshold\)"),
        },
        "gate": {
            "selective_mode": p("selective_mode"),
            "scarcity_indicator_limit": p("scarcity_indicator_limit"),
            "contention_indicator_limit": p("contention_indicator_limit"),
            "unmet_indicator_limit": p("unmet_indicator_limit"),
            "minimum_pressure_indicators": p("minimum_pressure_indicators"),
            "rule": "pressure_count = [scarcity >= limit] + [contention_increase >= limit] + [relative_unmet >= limit]; adaptation enabled if not selective_mode or pressure_count >= minimum_pressure_indicators",
            "count_source": find_py(M4_ADAPT, r"pressure_count = sum\("),
            "enabled_source": find_py(M4_ADAPT, r"adaptation_enabled = \(not self\.selective_mode or pressure_count >= self\.minimum_pressure_indicators\)"),
        },
        "activation": {
            "formula": "clip(s^k / (s^k + threshold^k + 1e-8), 0, 1)",
            "sensitivity_k": p("sensitivity"),
            "epsilon": 1e-8,
            "clip": [0.0, 1.0],
            "denominator_source": find_py(M4_ADAPT, r"denominator = \(numerator \+ adaptive_threshold \*\* self\.sensitivity \+ 1e-8\)"),
            "clip_source": find_py(M4_ADAPT, r"activation = np\.clip\(numerator / denominator, 0\.0, 1\.0\)"),
        },
        "code_defaults_match_config": {
            k: defaults[k] == ap[k] or (isinstance(ap[k], list) and list(defaults[k]) == ap[k])
            for k in ["stimulus_weights", "base_threshold", "sensitivity", "minimum_threshold", "maximum_threshold",
                      "scarcity_indicator_limit", "contention_indicator_limit", "unmet_indicator_limit", "minimum_pressure_indicators"]
        },
    }


def fixed_section() -> dict:
    fcfg = json.loads(F_CFG.read_text())
    sel = fcfg["selected_configuration"]
    configs, cfg_cell, cfg_line = nb_assignment("FIXED_CONFIGURATIONS")
    sens, s_cell, s_line = nb_assignment("SENSITIVITY")
    env_sens, e_cell, e_line = nb_init_default("FixedThresholdBEEEnv", "sensitivity")
    c = configs[sel]
    sel_ref = find_nb(rf'"{sel}": \{{', cell=cfg_cell)

    def entry_line(key: str) -> dict:
        lines = "".join(nb_cells()[cfg_cell]["source"]).splitlines()
        for i in range(sel_ref["line"], len(lines) + 1):
            if re.search(rf'"{key}":', lines[i - 1]):
                return {"file": rel(M3_NB), "cell": cfg_cell, "line": i, "text": lines[i - 1].strip()}
        raise SourceError(f"{sel} {key} not found")

    return {
        "id": f"fixed_{sel}",
        "label": f"Fixed BEE ({sel})",
        "stream": "fixed (member 3)",
        "environment": {"class": "FixedThresholdBEEEnv", "source": find_nb(r"class FixedThresholdBEEEnv")},
        "configuration_file": rel(F_CFG),
        "selected_configuration": with_ref(sel, find_json_key(F_CFG, "selected_configuration")),
        "stimulus_weights": {
            "scarcity": c["scarcity_weight"],
            "contention": c["contention_weight"],
            "unmet": c["unmet_demand_weight"],
            "source": {"scarcity": entry_line("scarcity_weight"), "contention": entry_line("contention_weight"), "unmet": entry_line("unmet_demand_weight")},
        },
        "definitions": {
            "placement_scarcity": {
                "words": "1 minus min(remaining feasible placements / number of visibility periods of the request, 1)",
                "source": find_nb(r"placement_scarcity = 1\.0 - placement_ratio"),
                "ratio_source": find_nb(r"placement_ratio = min\("),
            },
            "resource_contention": {
                "words": "static: the request's static_resource_contention from the processed data, min-max normalised and clipped to [0, 1]",
                "normalisation": "min and max of static_resource_contention over the training weeks of the run (per fold in the cross-week runs)",
                "source": find_nb(r"resource_contention = self\._normalize_contention\("),
                "normalise_source": find_nb(r"return float\(np\.clip\(normalized, 0\.0, 1\.0\)\)"),
                "fold_min_source": find_nb(r"fold_contention_min = float\(", cell=94),
                "fold_max_source": find_nb(r"fold_contention_max = float\(", cell=94),
            },
            "mission_unmet_ratio": {
                "words": "1 minus (seconds allocated so far to the request's mission / seconds requested by that mission this week); not clipped before use",
                "source": find_nb(r"mission_unmet = float\("),
                "shared_definition": find_py(SHARED_ENV, r"1\.0 - subject_allocated / subject_requested"),
            },
        },
        "stimulus": {
            "formula": "scarcity_weight * scarcity + contention_weight * contention + unmet_demand_weight * unmet (no clip in the formula; the whole observation is clipped to [0, 1])",
            "clip": None,
            "source": find_nb(r"configuration\[\"scarcity_weight\"\] \* placement_scarcity"),
            "observation_clip_source": find_nb(r"return np\.clip\(observation, 0\.0, 1\.0\)", cell=e_cell),
        },
        "threshold": {
            "kind": "fixed",
            "value": {"value": c["threshold"], "source": entry_line("threshold")},
            "source": find_nb(r"self\.fixed_configuration\[\"threshold\"\]"),
        },
        "gate": None,
        "activation": {
            "formula": "s^k / (s^k + threshold^k) (no epsilon, no clip)",
            "sensitivity_k": {"value": env_sens, "source": {"file": rel(M3_NB), "cell": e_cell, "line": e_line, "text": f"sensitivity={env_sens}"}},
            "notebook_constant_SENSITIVITY": {"value": sens, "source": {"file": rel(M3_NB), "cell": s_cell, "line": s_line, "text": f"SENSITIVITY = {sens}"}},
            "epsilon": 0.0,
            "clip": None,
            "numerator_source": find_nb(r"stimulus_term = stimulus \*\* self\.sensitivity"),
            "source": find_nb(r"activation = stimulus_term / \(", cell=e_cell),
        },
        "configurations_source": {"file": rel(M3_NB), "cell": cfg_cell, "line": cfg_line, "text": "FIXED_CONFIGURATIONS = {"},
    }


def build() -> dict:
    out = {
        "statement": "The BEE features are inputs to the policy. The action mask is the shared feasibility mask.",
        "mask": mask_section(),
        "methods": {
            "fixed_F2": fixed_section(),
            "adaptive_A6": adaptive_section(A6_CFG, "A6"),
            "adaptive_A3": adaptive_section(A3_CFG, "A3"),
        },
        "differences_note": (
            "Fixed BEE (F2) and adaptive BEE differ in stimulus weights, in the contention definition (static min-max over "
            "training weeks vs dynamic competitors / valid actions), in the scarcity definition and in the activation "
            "formula details (no 1e-8 term and no clipping in F2). Adaptive minus fixed BEE is therefore not an isolated "
            "effect of the threshold rule (see N4)."
        ),
    }
    if out["methods"]["fixed_F2"]["id"] != "fixed_F2":
        raise SourceError("fixed BEE selected configuration is not F2")
    return out


# ------------------------------------------------------------------ notes
def _refs(obj, path=""):
    if isinstance(obj, dict):
        if "file" in obj and ("line" in obj or "lines" in obj) and "text" in obj:
            yield path, obj
        for k, v in obj.items():
            yield from _refs(v, f"{path}.{k}" if path else k)


def notes_markdown(params: dict) -> str:
    def loc(r):
        cell = f", cell {r['cell']}" if "cell" in r else ""
        line = f"lines {r['lines'][0]}-{r['lines'][1]}" if "lines" in r else f"line {r['line']}"
        return f"`{r['file']}`{cell}, {line}"

    out = [
        "# BEE mechanism notes",
        "",
        "Generated by `scripts/export_data.py` (via `scripts/bee_params.py`) from the code and configuration files.",
        "Each entry quotes the exact source line so the team can check it without reading the code.",
        "",
        f"**{params['statement']}**",
        "",
        "## The action mask",
        "",
    ]
    for k, r in params["mask"].items():
        if isinstance(r, dict):
            out.append(f"- **{k.replace('_', ' ')}**: {loc(r)}  \n  `{r['text']}`" + (f" ... `{r['end_text']}`" if "end_text" in r else ""))
    for mid, m in params["methods"].items():
        out += ["", f"## {m['label']} ({m['stream']})", ""]
        w = m["stimulus_weights"]
        out.append(f"- Stimulus weights: scarcity {w['scarcity']}, contention {w['contention']}, unmet {w['unmet']}")
        for name, d in m["definitions"].items():
            out.append(f"- {name}: {d['words']}" + (f" (normalisation: {d['normalisation']})" if "normalisation" in d else ""))
        out.append(f"- Stimulus: {m['stimulus']['formula']}")
        t = m["threshold"]
        if t["kind"] == "fixed":
            out.append(f"- Threshold: fixed at {t['value']['value']}")
        else:
            out.append(
                f"- Threshold: {t['formula']}; base {t['base_threshold']['value']}, strengths scarcity {t['scarcity_strength']['value']}, "
                f"contention {t['contention_strength']['value']}, unmet {t['unmet_strength']['value']}, clip [{t['minimum_threshold']['value']}, {t['maximum_threshold']['value']}]"
            )
            g = m["gate"]
            out.append(
                f"- Gate: selective_mode {g['selective_mode']['value']}; limits scarcity >= {g['scarcity_indicator_limit']['value']}, "
                f"contention increase >= {g['contention_indicator_limit']['value']}, relative unmet >= {g['unmet_indicator_limit']['value']}; "
                f"needs {g['minimum_pressure_indicators']['value']} indicators"
            )
        a = m["activation"]
        out.append(f"- Activation: {a['formula']}, k = {a['sensitivity_k']['value']}")
        out += ["", "| What | Where | Line |", "|---|---|---|"]
        for path, r in _refs(m):
            out.append(f"| {path} | {loc(r)} | `{r['text'].replace('|', '/')}` |")
    out += ["", "## Differences between the streams", "", params["differences_note"], ""]
    return "\n".join(out)
