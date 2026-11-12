# Copy deck

Proposed wording for every page, for review before anything changes in the app. Old text is quoted from the running app
(full list with locations in `docs/copy_audit_strings.csv`; summary in `docs/COPY_AUDIT.md`). Word counts are for the new text.

Conventions in this document:

- `{name}` marks a value filled from the data files when the page loads. The source field is given once per template. No number in the new copy is typed in.
- "Details" means a closed disclosure under the item. "?" means a small popover. Raw identifiers only appear there.
- Budgets: page intro 25 words or fewer, section intro 20 or fewer, chart caption 15 or fewer, tooltip 30 or fewer.

---

## 1. Shared vocabulary

### 1.1 Metrics: label and definition from the code

Each definition describes what the code computes. Metrics are computed per week and per run by `BEEGroundStationEnv.get_episode_metrics`
in `shared/src/environment.py` (lines 727-831). The week's requested time is the sum of `duration_seconds` over that week's requests (line 163).

| Field (Details only) | New label | Definition shown in "?" | Code reference |
|---|---|---|---|
| `duration_fulfillment` | Requested time delivered | Share of all antenna time requested that week that the schedule delivered. | `environment.py` 730-735 and 749-752: scheduled `allocated_seconds` summed, divided by the week's total requested seconds |
| `minimum_satisfaction_rate` | Got at least their minimum | Share of the week's requests that were scheduled for at least their minimum duration. | `environment.py` 737-741 and 754-757: count of placements with allocated ≥ minimum, divided by the number of requests in the week |
| `full_satisfaction_rate` | Fully served | Share of the week's requests that got their full requested duration. | `environment.py` 743-747 and 759-762: count of placements with allocated ≥ requested, divided by the number of requests |
| `unmet_hours` | Hours not delivered | Requested hours that the schedule did not deliver. | `environment.py` 764-768 and 826: total requested minus allocated seconds, floored at 0, in hours |
| `mission_fairness` | Fairness across missions | How evenly missions got their requested time, from 0 to 1. 1 means every mission got the same share. | `environment.py` 770-807: Jain's index over each mission's allocated ÷ requested |
| `constraint_violations` | Rule violations | Schedule entries that break a rule. Every run has 0. | `shared/src/validator.py` 42-212: duplicates, wrong duration, outside visibility, during maintenance, overlap on an antenna, wrong antenna |
| `runtime_seconds` | Time to build a week | Seconds of computer time to build one week's schedule. | `shared/src/experiment_utils.py` 61 and 80: wall-clock time around the episode |

Notes from reading the code:

- The two "requests" rates divide by every request in the week, scheduled or not, so an unscheduled request counts as not served.
- "Fairness across missions" is about missions, not requests: it is computed on each mission's share of its own requested time.
- Your suggested direction matched the code for all six. Runtime is a seventh metric that the Results selector already offers.

Decision for you: rates are stored as fractions (0.6176). The deck shows them as percentages (61.8%) in the main view and keeps four decimals in Details and downloads. Say if you prefer fractions everywhere.

### 1.2 Method names

| Code (small secondary label) | New primary name | Why |
|---|---|---|
| `plain_ppo` | Learner without BEE | Maskable PPO on the shared rules only |
| `fixed_bee` F2 | Learner with BEE, fixed threshold | `bee_params.json` fixed_F2: constant threshold 0.5 |
| `adaptive_bee` A6 | Learner with BEE, adaptive threshold | `bee_params.json` adaptive_A6 |
| `adaptive_a3_first_pass` A3 | Earlier adaptive version | first selected rule, later replaced |
| heuristics | Simple rules | no training |

Simple rules, named from what each rule picks among the allowed requests (member 1 notebook, cells 29, 33, 37, 41, 61):

| Code | New name | What the code does |
|---|---|---|
| `random_feasible` | Random allowed request | picks uniformly among allowed requests (cell 29) |
| `earliest_window_end` | Earliest deadline first | picks the smallest time-window end (cell 33) |
| `shortest_duration` | Shortest request first | picks the smallest requested duration (cell 37) |
| `least_flexible` | Fewest viewing windows first | picks the largest `placement_scarcity_raw`, which equals 1 ÷ number of visibility windows for every request (cell 41; checked on all 1,452 requests) |
| `weighted_composite_H4` H4 | Weighted score | 0.5 × few windows + 0.3 × deadline urgency + 0.2 × mission still unmet, duration weight 0 (cell 61, `heuristics_configuration.json`) |

### 1.3 Ablation variants

From the component flags in `ablation.json` and the parameters in `bee_params.json`:

| Code | Flags | New name |
|---|---|---|
| A1 | scarcity, contention, unmet on; gate off; full strength | All three signals, always adapting |
| A2 | scarcity only | Scarcity signal only |
| A3 | contention only | Contention signal only |
| A4 | unmet only | Unmet-demand signal only |
| A5 | all three; gate off; lower strength | All three signals, weaker |
| A6 | all three; selective gate on; full strength | All three signals, adapts under pressure |
| F2 | fixed threshold; weights 0.5 / 0.3 / 0.2 | Fixed threshold |

"Adapts under pressure" tooltip: "Changes the threshold only when at least two of the three signals pass their limits." (19 words)

### 1.4 Evidence badges: one per card, table or chart

| Old badge | New badge | Tooltip (exact stage, at most 30 words) |
|---|---|---|
| full cross-week (25,088) | full test | All five test weeks, 25,088 training steps per model. |
| screening (1,024 steps) | short trial | Trial on W40 only, 1,024 training steps, one seed. Good for shortlisting, not for conclusions. |
| shortlist (5,120) | longer trial | Trial on W40 only, 5,120 training steps, one seed. |
| confirmation (10,240) | final trial | Trial on W40 only, 10,240 training steps, three seeds. |
| heuristic (no training) | simple rule | A fixed rule with no training. Run on the same five test weeks. |
| recomputed from schedules | rebuilt from schedules | Rebuilt from the saved schedules with the shared scoring code. Matches the team's own totals. |
| supplementary | extra runs | Runs outside the main comparison, shown for context only. |
| recorded trace value | recorded | Value as saved during a test run. |
| what-if, computed from the equations | try it | Computed in your browser from the code's formulas. Not a result. |
| illustrative | illustrative | Placement for the picture only. Not from the data. |
| configuration record | settings | Taken from the team's settings files. |
| awaiting owner confirmation | open question | Recorded in the team's files but not yet confirmed. See Protocol. |
| pending data | not available yet | This value is missing from the data. See Protocol. |

### 1.5 Repeated caveats

| Old (many places) | New (once per page, under the page intro) |
|---|---|
| "n = 5 folds, indicative only", "(n = 5 folds)", "Suggestive only: n = 5 folds..." | Only five test weeks, so treat small gaps as hints. (10 words) |
| "W50 seed SD", "fold SD", "Scale (shaded): ±... the larger W50 seed SD of the two methods" | Shaded band labelled "typical seed-to-seed variation", with one "?": "How much results move when only the random seed changes, measured on W50. Gaps inside the band are within that variation." (21 words) |
| N1, N2, N3, N4 markers on rows and pairs | One small link "Open question" that opens the Protocol page at that item. The id stays in its tooltip only. |
| "hypothesis, not tested" | an idea, not tested |

### 1.6 Other words

| Old | New |
|---|---|
| fold, test week, held-out week | test week |
| training seed / evaluation seed | training run / test run (Details keep the seed numbers) |
| cross-week | across the five test weeks |
| policy, observation | the learner, what the learner sees |
| feasibility mask, action mask | the shared rules for what is allowed |
| stimulus, activation | pressure score, BEE score (Details give the code names) |
| paired difference | gap between two methods |
| bootstrap interval | range of likely gaps (Details only) |

---

## 2. Navigation and shared panels

| Item | Old | New |
|---|---|---|
| Nav brand subtitle | Ground-station scheduling study | Antenna scheduling study |
| Nav links | Mission Control · BEE Mechanism · Ablation · Results · Guided Tour · Protocol | Explore a week · How BEE works · Variants · Results · Tour · Method |
| "How to read this" button | How to read this | Help |
| Help panel, this page | 5 bullets, 107 words (Mission Control) | One line per page, 20 words or fewer, plus "Try this". Example for Mission Control: "Pick a week and a method. The globe and timeline show the same schedule." |
| Help panel, reading the numbers | 5 bullets, 96 words | "Numbers come from the team's result files. Only five test weeks, so treat small gaps as hints." (17 words) |
| Help panel, badges | 10 badges listed | The badge table from 1.4, with tooltips |
| Help panel, method colours | names with shape and dash label | Same, with the new names from 1.2 |
| Footer | project title, placeholders | unchanged |

---

## 3. Landing

| Item | Old | New | Words |
|---|---|---|---:|
| Kicker | BEE | BEE | 1 |
| Title | A Bee-Inspired Reinforcement Learning Scheduler for Ground-Station Communication Requests | unchanged | 12 |
| One sentence | A comparison of heuristic rules, plain PPO and two bee-inspired PPO variants for scheduling Deep Space Network antenna time, tested across five weeks of real 2018 requests. | We compared simple rules and learning schedulers for booking Deep Space Network antennas, using five real weeks from 2018. | 19 |
| Card 1 | (none) | **Explore a week of antenna scheduling.** Watch requests turn into antenna bookings on a globe and a timeline. Button: Open | 16 |
| Card 2 | (none) | **See how BEE works.** Move a slider and see what extra information BEE gives the learner. Button: Open | 17 |
| Card 3 | (none) | **Compare the methods.** See which approach delivered the most requested time, and by how much. Button: Open | 16 |
| Buttons | Open the lab · Start the tour (coming next) | Open the lab · Start the tour, disabled, small text "coming next" | |
| Team block | four placeholders, affiliation, "Team details are placeholders." | unchanged until team.ts is filled in | |
| Strip title | Overall duration fulfillment, five test weeks | Requested time delivered, average of five test weeks | 8 |
| Strip cards | method code labels, value, "W50 seed SD 0.0088" | New method names, value as %, no SD text; the shaded band style shows the variation | |
| Strip note | Listed in a fixed order, not ranked. Compare differences with the W50 seed SD (n = 5 folds). Full tables, paired differences and their limits are in the Results Arena. | Fixed order, not a ranking. Only five test weeks, so treat small gaps as hints. | 15 |
| Strip badge | full cross-week (25,088) · heuristic (no training) | one badge: full test | |
| Globe chip | illustrative · DSN complexes at their public locations; rotation is decorative | illustrative · Antenna sites are real; the spin is decoration. | 8 |

---

## 4. Mission Control ("Explore a week")

Page intro (new): "Watch one week of antenna bookings, request by request." (9 words)
Try this: "Press Play, then click a coloured bar to find its spacecraft." (11 words)
Caveat line: none needed on this page.

| Item | Old | New |
|---|---|---|
| Left panel headings | WEEK (TEST FOLD) · METHOD · TRAINING SEED · EVALUATION SEED · Compare mode · TIMELINE LAYERS | Week · Method · Training run · Test run · Compare two methods · Show on timeline |
| Training seed option labels | 42 · 123 (supplementary) · 456 (metrics only) | Run 1 · Run 2, extra · Run 3, numbers only. "?" gives the seed number. |
| Layer labels | Maintenance intervals · Visibility windows · "The selected request's own windows are always outlined." | Antenna maintenance · When each spacecraft is visible · (hint dropped) |
| View toolbar | VIEW · Whole system · Goldstone · Canberra · Madrid · Follow active link | View · Whole Earth · Goldstone · Canberra · Madrid · Follow a link |
| Scene chips | title chip · clock and "Active links: 4" · "illustrative · Spacecraft positions illustrative; schedule data is real" · "unscheduled, in window" · shape legend | method chip · clock and "4 links now" · one note: "Spacecraft positions are illustrative. Times, antennas and missions are real." · legend dot "waiting, not booked" |
| Metrics panel title | Adaptive BEE (A6) + full cross-week badge + "W40_2018 · fold 4 · training seed 42 · evaluation seed 1001" | Learner with BEE, adaptive threshold · small A6 · one badge "full test" · "Week 40, run 1, test run 1" |
| Headline metrics (large) | five metric cards, each with "W40 mean …" and "Cross-week mean …, fold SD …, n = 5 folds" | Three large: Requested time delivered · Fully served · Hours not delivered. Under each: "This week's average {week mean}" and the band "typical seed-to-seed variation". |
| "More" disclosure | (all shown) | Got at least their minimum · Fairness across missions · Rule violations 0 · Scheduled and not scheduled counts |
| Violations box | Constraint violations 0 ✓ | Rule violations: 0 |
| Counts | Scheduled 220 of 333 · Unscheduled 113 | 220 of 333 booked · 113 not booked |
| Detail card heading | Request 3dbbf258-1-1 | Request from mission {mission}. Request id under Details. |
| Detail rows | Mission · Requested · Time window · Antenna options · Antenna · Start · End · Allocated · Visibility used · "array spans Goldstone + Canberra" | Mission · Asked for · Could run between · Possible antennas · Booked on · Starts · Ends · Got · Spacecraft visible · "Two sites working together: Goldstone and Canberra" |
| Status chips | scheduled · not scheduled | booked · not booked |
| Jump button | Jump to start | Go to start |
| Empty detail text | Click a request in the timeline, a beam, a spacecraft or the unscheduled list to see its details. (20 words) | Click a bar, a beam or a spacecraft to see that request. (12 words) |
| Unscheduled list title | Unscheduled (A) · 113 of 333 | Not booked · 113 of 333 |
| Compare panel | "Same week, same seeds" · Both · Neither · Only A · Only B · "A = …; B = …. Requests scheduled by only one run are outlined (dashed) in the timeline and drawn as dashed beams." (36 words) | "Same week, same test run" · Booked by both · By neither · Only A · Only B · "Dashed means only one method booked it." (7 words) |
| N4 note in compare | long note | Open question link only |
| Pending text | Schedule not exported for this training seed; metrics only. | No schedule saved for this run. Numbers only. |
| Playback hint | wheel: zoom · shift+drag: pan · space: play | Scroll to zoom · Shift-drag to move · Space to play |

---

## 5. BEE Mechanism ("How BEE works")

Page intro (new): "BEE gives the learner extra information about each request. It never changes which requests are allowed." (17 words)
Try this: "Drag the slider and watch the cards change." (8 words)

Key finding banner (new, replaces the source-line banner): "The shared rules decide what is allowed. BEE only adds extra inputs for the learner." (15 words). The file and line references move to Details.

### 5.1 Section (a): "What BEE adds"

| Item | Old | New |
|---|---|---|
| Title | How BEE decides what the policy sees | What BEE adds |
| Section intro | BEE adds information to the observation; it does not remove actions. The set of allowed actions ... extra inputs. (44 words) | Each request gets a pressure score and a BEE score. The learner sees them. Nothing is removed. (17 words) |
| Cards panel title | What the policy sees · two badges | What the learner sees · badge "recorded" |
| Cards panel text | Illustrative: requests chosen at different steps of one trained run (adaptive A6, W40, training seed 42, evaluation seed 1001). Each card is ... (56 words) | Twelve requests the trained model picked, at different moments of one week. Move the threshold to see their BEE scores change. (21 words). Details: run and seed numbers. |
| Slider | Threshold θ (what-if) · range and formula hint | Threshold · "?": "A higher threshold needs more pressure for a high BEE score." Formula in Details. |
| Card labels | 0.54 · activation · s 0.541 · allowed at step 0 | 54% · BEE score · pressure 0.54 · allowed at step 0 |
| Curve axis labels | stimulus s · activation | pressure score · BEE score |
| Episodes notice | The panel above and the panel below come from different episodes (a trained A6 run and a random-policy diagnostic run). They are not a single state. (26 words) | The two panels come from different test runs, so they do not show the same moment. (16 words) |
| Allowed panel title | What is allowed: a different episode · badge | What is allowed · badge "recorded" |
| Allowed panel text | The shared feasibility mask: ... It is not the trained A6 run above, and θ never changes it. (61 words) | Requests still possible at each step of a separate test run with random choices. The threshold never changes this. (19 words). Details: rule A1, seeds 42 and 0, 222 steps, generator cell. |
| Allowed count line | Step 0: 333 of 333 requests allowed | Step 0: 333 of 333 still allowed |

### 5.2 Section (b): "Try the formula"

| Item | Old | New |
|---|---|---|
| Title + badge | What-if sandbox · what-if, computed from the equations | Try the formula · badge "try it" |
| Section intro | Choose input values and see the stimulus, threshold and activation each method's code would compute. These are what-if values computed from the equations, not results. (26 words) | Set the inputs and see what each BEE version would compute. These are not results. (15 words) |
| Try this | (none) | Raise scarcity past 0.30 and watch the adaptive rule switch on. (11 words) |
| Slider labels | Placement scarcity · Resource contention · Contention increase (adaptive) · Mission unmet ratio · Relative unmet pressure (adaptive) | How few slots are left · How many requests compete · Rise in competition · How much the mission still needs · Need compared with other missions |
| Method buttons | Fixed BEE (F2) · Adaptive BEE (A6) · Adaptive BEE (A3) | Fixed threshold · Adaptive, under pressure · Earlier adaptive |
| Result cards | STIMULUS · THRESHOLD θ · ACTIVATION, with formula lines | Pressure score · Threshold · BEE score. Formulas under "Show the formula". |
| Gate chips | scarcity ≥ 0.3 · Δ contention ≥ 0.1 · relative unmet ≥ 0.1 · "Selective gate: 2 of 3 indicators fire, needs 2: adaptation on" | Few slots · Rising competition · High need · "2 of 3 signals on, so the threshold adapts" or "Fewer than 2 signals, so the threshold stays at 0.5" |
| Compare table caption | Same inputs, all three methods (what-if) | Same inputs, three versions |
| N4 note | Fixed vs adaptive is not like for like. {long differences note} (52 words) | The fixed and adaptive versions also compute their inputs differently, so this is not a pure threshold comparison. (18 words) + Open question link |
| Definitions disclosure | Input definitions in each method's code (with file and line) | Details: How each version computes its inputs (unchanged content) |

### 5.3 Section (c): "Replay a real step"

| Item | Old | New |
|---|---|---|
| Section intro | Pick a cross-week run and a step from the exported threshold traces. The table shows ... browser equations. (36 words) | Pick a run and a step. See the saved values, then check them with the formula. (16 words) |
| Try this | (none) | Press Check and see the difference shrink to zero. (9 words) |
| Selectors | CONFIGURATION · RUN (WEEK · TRAINING SEED · EVALUATION SEED) · Step | Version · Run · Step |
| Button | Recompute from recorded inputs | Check with the formula |
| Table | 12 rows with raw field names | 4 rows in view: Pressure score · Threshold · BEE score · Signals on. "Show raw values" opens the full 12-row table with the code names. |
| Result line | Largest difference 0.00e+0: below 1e-6, the browser equations reproduce the recorded values. | The formula gives the same values as the saved run. Details: largest difference {max}. |
| Source line | Request …, action …. Source: data/schedules/… | Details only |

### 5.4 Section (d): "What the runs show"

| Item | Old | New |
|---|---|---|
| Title + badge | What the traces show · full cross-week | What the runs show · badge "full test" |
| Section intro | A6 cross-week traces record ... (thresholds_summary in thresholds.json). (25 words) | How often the adaptive threshold moved, across every step of all test runs. (13 words) |
| Share line | 5,889 of 7,247 recorded selections (81.3%) are at the base threshold 0.5; the remaining 1,358 were adapted lower. Mean ... minimum ... | In {share_at_base}% of steps the threshold stayed at {base}. In the rest it went lower. Details: counts, mean, minimum. |
| Chart caption | selected threshold (navy bar: exactly 0.5) | Threshold at each step. Dark bar: unchanged. (6 words) |
| Per-fold table | Per fold, from adaptive_threshold_results.csv | under Details |
| Diagnostic title | Diagnostic: the three adjustment terms per step (random-policy episode) · badge | What moves the threshold · badge "recorded" |
| Diagnostic text | Means over the 222 steps: scarcity term 0.082, unmet term 0.0098, contention term 0.00016 (max 0.011). In this diagnostic ... not a trained A6 run. (55 words) | Scarcity moves the threshold most. Competition barely moves it. This comes from a random-choice test run, not the trained model. (20 words). Values from `thresholds.json` term means shown in the chart legend. |
| Correction sentence (required) | (inside the long text) | The "competition is close to zero" figure comes from a random-choice test run, not from the trained model. (18 words) |
| Hypothesis | hypothesis, not tested · Contention is measured relative to ... (35 words) | an idea, not tested · Competition is measured against each request's own starting level, which may keep the rise small. (17 words) |

---

## 6. Ablation ("Variants")

Page intro (new): "We tried six versions of the adaptive rule on one week, then kept one." (14 words)
Try this: "Click a variant to see how far it got in testing." (11 words)
Caveat line: "Most variants only had a short trial, so these numbers cannot say which signal matters." (15 words)

| Item | Old | New |
|---|---|---|
| Can and cannot panel | two lists, 190 words | Replaced by the caveat line above. The full can and cannot list moves to Details (unchanged text, plain names). |
| One chart | matrix + 3 stage cards + threshold bars + table | One chart: requested time delivered per variant, one bar per trial stage reached, badge per stage group. Caption: "Taller bars delivered more. Missing bars mean that stage was not run." (12 words) |
| Variant labels | A1 … A6 column buttons | New names from 1.3, code in small text |
| Component matrix | on/off table + toggles | under Details ("Which signals each variant uses") |
| Reference toggle | Reference A6 / A3 + long A3 label | Compare against: Chosen version · Contention-only version. "?": "The contention-only version barely moved its threshold, so it is close to a fixed threshold. Not a true no-adaptation test." (21 words) |
| Stage cards | metric tables with "vs A6 lower by 0.0038" | One card per stage reached, three lines: Requested time delivered · Fully served · Fairness, each with "higher / lower / about the same than the chosen version". Full table under Details. |
| Tie panel | 4 number tiles + 37-word paragraph + rule | "The two finalists were about the same. The tie-break picked the one whose threshold moved more." (16 words). Numbers under Details. |
| Threshold section | chart + table + two boxes | Details: "How far each variant moved its threshold" |
| Cross-week context | chart + paragraph + table, "Suggestive only: n = 5 folds..." | "Across five test weeks the chosen version delivered less time than the earlier one in {lower_folds} of 5." (17 words) Chart stays, table under Details. |

---

## 7. Results

Page intro (new): "See how every method did across five real weeks." (9 words)
Try this: "Switch the measure and see whether the order changes." (9 words)
Caveat line: "Only five test weeks, so treat small gaps as hints." (10 words)

Layout: one chart first, then tabs "Table" and "Compare two methods".

| Item | Old | New |
|---|---|---|
| Lead sentence (data) | What the table shows: for duration fulfillment, Heuristic: earliest window-end has the highest overall value (0.6798). | "{top_method} delivered the most requested time: {top_value}%." Filled from `results_summary.json` overall means. (about 9 words) |
| Lead chart | By week, every fold visible, 9 toggles | Same chart, default four series: Earliest deadline first, Random allowed request and the three learners. Caption: "Each dot is one test week. Band: typical seed-to-seed variation." (11 words) |
| Measure picker | Metric | Measure, with the new labels |
| Table tab | full table always shown, Evidence column | Table tab: same table, new names, one badge per group (full test, simple rule, extra runs). Fold SD and W50 seed SD move to a "Show spread" toggle. Download stays. |
| Supplementary fixed BEE row | Fixed BEE, all training seeds on every fold | under "Show extra runs" |
| Compare tab | four fixed pair strips + heuristic toggle | "Compare two methods": two pickers, one strip, shaded band, one result line. Default: Learner with BEE, adaptive threshold vs Learner without BEE. |
| Compare result line | Mean difference lower by 0.0026; first method higher in 2 of 5 folds; per-fold range ...; Bootstrap interval ... (about 45 words) | "{A} is {higher/lower/about the same} than {B} by {gap} on average, and higher in {k} of 5 weeks." Details: range and likely-gap range. |
| Simple-rule pairs | toggle label "Show PPO-based methods minus each heuristic rule (supplementary; compared on evaluation seeds only)" | Pickers include the simple rules. When one is picked, a small note: "Simple rules have no training runs, so only test runs are compared." (12 words) |
| N4 beside adaptive vs fixed | long orange box | Open question link: "Fixed and adaptive BEE also differ in how they compute inputs." (11 words) |
| What these results show | 7 template sentences, 273 words | Three bullets, data-filled: (1) "{rule} scored highest: {value}%." (2) "The three learners and Random allowed request are within {band} of each other." (3) "Adaptive thresholds did not help in these runs: {gap} versus the fixed version." Exact wording is chosen at load time from the data, see 7.1. |
| Cannot show | 3 bullets, 64 words | One line: "These runs cannot rank the three learners." (7 words) Rest under Details. |
| Hypothesis | hypothesis, not tested · Under the shared 25,088-step budget ... (32 words) | an idea, not tested · The learners may need more training to pull apart. (9 words) |

### 7.1 The three data-filled bullets

| Bullet | Template | Filled from | Rule for the words |
|---|---|---|---|
| 1 | "{top} scored highest on requested time delivered: {top_value}%." | `results_summary.json` series overall mean | highest overall mean among all non-secondary series |
| 2 | "The three learners and Random allowed request are {about the same / not about the same}: {min}% to {max}%." | same | "about the same" when max minus min ≤ the largest W50 seed SD of the four |
| 3 | "Adaptive thresholds did not help in these runs: {lower/higher/about the same} than the fixed version by {gap}." | `paired.json` adaptive minus fixed, mean difference and band | "about the same" when |mean| ≤ band. The fixed headline "did not help" is only used when the mean difference is ≤ 0 or within the band; otherwise the bullet says "higher by {gap}, within / outside the seed variation". |

Today's data would read: "Earliest deadline first scored highest on requested time delivered: 68.0%." · "The three learners and Random allowed request are about the same: 61.8% to 62.3%." · "Adaptive thresholds did not help in these runs: about the same as the fixed version." Shown here for review only; the app fills them at load.

---

## 8. Protocol ("Method")

Page intro (new): "How the study was run and how to rebuild this site." (11 words)

Each section: one short line in view, everything else in Details.

| Section | Old | New line in view | In Details |
|---|---|---|---|
| Selection rule | 116 words, file names, notebook quotes | "Each method was tuned on week 40 only, then frozen before testing." (12 words) | per-method selection with codes and quotes |
| Shared settings | PPO table, reward, budget table with file sources | "All learners share the same settings and 25,088 training steps." (10 words; the number filled from `protocol.json`) | PPO parameters, reward formula, budget table with sources |
| Seeds and averaging | 79 words | "Five test runs per week. One training run, three on week 50." (12 words; numbers from `protocol.json`) | seed numbers, averaging order, weekly request totals |
| Data | 92 words, notebook paths | "Real Deep Space Network requests from 2018. No spacecraft orbits, so positions in the pictures are illustrative." (17 words) | notebook list, mechanism notes link |
| Open questions | table with N1-N4, owners, 243 words | "Four points still need the owner's confirmation." then one plain line each, see 8.1 | full text, ids N1-N4 |
| Missing data | G1, G3, G4, G5 with markdown | "Four things are missing from the data." then one plain line each, see 8.2 | full text, ids |
| Downloads | file list | "Download the data behind every page." + list (file names allowed here, it is a download list) | |
| Rebuild | 4 steps with commands | unchanged (commands are the point of this section) | |

### 8.1 Open questions, plain lines

| Id (Details) | New line |
|---|---|
| N1 | Was the fixed version tuned on week 40 only? |
| N2 | Should the plain learner's settings list all three training runs? |
| N3 | Were the simple rules run with the current shared code? |
| N4 | Should the fixed and adaptive versions compute their inputs the same way? |

Owners: shown with the placeholder names from `team.ts`, unchanged.

### 8.2 Missing data, plain lines

| Id (Details) | New line |
|---|---|
| G1 | The final adaptive notebook section was saved without its outputs. |
| G3 | Run times for each fixed-threshold test run were not saved. |
| G4 | The team's own paired comparison file is empty; the site computes it. |
| G5 | Team names and affiliation are not filled in yet. |

---

## 9. Guided tour, draft script

Six steps, at most two short sentences each. Not built yet.

| Step | Scene | Text |
|---|---|---|
| 1. The problem | Whole Earth, all three sites | Three antenna sites must talk to dozens of spacecraft. There is not enough antenna time for every request. |
| 2. A request | One request selected, its windows outlined | A request asks for time on an antenna while its spacecraft is visible. It has a deadline and a minimum length. |
| 3. Resolving conflicts | Two requests competing for one antenna | When two requests want the same antenna, a scheduler picks one. The shared rules decide what is allowed. |
| 4. What BEE adds | BEE page cards, slider moving | BEE gives the learner a score for how urgent each request looks. It never removes a choice. |
| 5. Adaptive thresholds | Threshold histogram | The adaptive version lowers its threshold when slots get scarce. Most of the time it stayed unchanged. |
| 6. What we found | Results chart | One simple rule, earliest deadline first, delivered the most time. The learners were about the same as each other and as random choice. |

Step 6 must be filled from the same data templates as Results bullet 1 and 2 when built.

---

## 10. Decisions for you

1. Percentages for rates in the main view (proposed) or fractions everywhere.
2. Nav labels: the deck renames pages (Explore a week, How BEE works, Variants, Results, Tour, Method). Keep the old names if you prefer.
3. Method names: "Learner without BEE / with BEE, fixed threshold / with BEE, adaptive threshold" (proposed), or keep PPO in the primary name.
4. Ablation: one chart replaces the matrix, stage cards and threshold chart, which move to Details.
5. Results bullet 3 wording: the deck states "Adaptive thresholds did not help in these runs" as the brief asks, guarded by the data rule in 7.1.
