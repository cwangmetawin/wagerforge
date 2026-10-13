# wagerforge behavioural evals

These 29 English engineering prompts tempt specific money, math, fairness and certification mistakes. One case format runs in Claude Code's plugin eval and in the Codex runner. The LLM criteria require the corrected rules and explicitly fail endorsements of the folk claims.

This suite measures whether an agent gives the required guidance and whether the intended skill appears to fire. It does not certify a game, prove reference-script correctness, establish real wallet atomicity, or replace RNG/math laboratory assessment. Unit tests validate the harness and case contracts; actual model runs provide separate behavioural evidence.

## Run Claude Code

The format targets Claude Code **2.1.296** plugin eval. Run from the repository root; default with/without-plugin ablation is retained.

~~~sh
claude plugin eval . --model sonnet --runs 1 --judge-model sonnet
~~~

For a bounded, local result file:

~~~sh
mkdir -p evals/results
claude plugin eval . --trust-plugin --model sonnet --runs 1 --judge-model sonnet -j 2 --no-publish --json evals/results/claude-run-1.json --max-cost-usd 20
~~~

No model or runs fields are set in the case frontmatter: the command chooses them. Each prompt sets schema_version "1.1", max_turns 8, timeout_seconds 300 and allowed_tools [Read, Glob, Grep, Skill]. Each LLM grader uses the framework's three judge votes, passing on two. The judge is sonnet, not the default haiku: in an early run haiku failed a fully conforming answer by three votes to none.

## Run Codex

Requires Node 26 and an already installed/configured Codex CLI. There are no npm dependencies. The runner itself never loads home-directory settings or credentials.

Preview all commands without starting children or creating workspaces:

~~~sh
node evals/run-codex.mjs --dry-run --json evals/results/codex-dry-run.json
~~~

Run the suite only when ready to make model calls:

~~~sh
node evals/run-codex.mjs --model gpt-6.1-sol --effort max --concurrency 3 --timeout-s 900 --json evals/results/codex-run-1.json
~~~

Preview or select a subset with a quoted case-name glob:

~~~sh
node evals/run-codex.mjs --case 'c0*' --dry-run
node evals/run-codex.mjs --case 'verify-single-float' --concurrency 1 --json evals/results/codex-single.json
~~~

Defaults: model gpt-6.1-sol, effort max (gpt-6.1-sol is run at max or ultra only), case '*', concurrency 3, timeout 600 seconds per child. Concurrency is 1–4 and includes judge children. Unknown/duplicate flags, invalid timeouts and empty selections fail. Every case file is parsed before selection or execution.

Each case has two fresh workspaces:

- **with**: every current skills/<skill>/ folder is copied into .codex/skills/<skill>/ so Codex can discover project skills. Symlink skill folders/content are rejected. Hooks, commands, agents and reference scripts outside skills/ are not copied.
- **without**: an empty temporary project directory.
- **judge**: three separate empty temporary directories per arm, using the same model and effort as the answer; two passing votes are required.

The assistant receives the exact user body read from prompt.md through an explicit pipe; frontmatter is configuration, not part of the user message. The command uses an argv array, never a shell or inherited stdin:

~~~text
codex exec -m <model> -c model_reasoning_effort="<effort>" --sandbox read-only --skip-git-repo-check -C <tmp> --json -o <tmp>/last.md -
~~~

Each child is detached in its own POSIX process group. A timeout or oversized event output kills that entire group with process.kill(-pid, 'SIGKILL'); there is no pkill/killall. Workspaces are removed in finally blocks. SIGINT/SIGTERM stop active groups and queued work. macOS/Linux process-group behavior is required.

A full run makes 58 answer calls plus 174 judge calls. --dry-run makes zero calls and prints JSON command records, including argv, stdin, source filename and placeholder judge answers. Its optional JSON file is a **plan**, with dryRun true and no scores.

Codex's project-directory ablation does not remove already installed global skills/plugins or inherited CLI configuration. Use an environment without global wagerforge skills for a clean control. A path mention in the event stream is an indicator, not proof of a completed successful file read. Claude evaluates the complete plugin; Codex evaluates the copied portable skills. Codex uses --timeout-s and read-only sandboxing; Claude's max_turns and named allowed_tools have no identical enforcement here. Optional per-case model/runs/plugins/env/append_system_prompt/expected_outcome settings are not used by this suite; Codex run controls come from its CLI.

## Read results

Run outputs belong in **evals/results/**, which is already git-ignored. Save each full suite invocation separately as `<agent>-run-<n>.json`. For three runs per agent, keep the model, judge/effort and case selection fixed:

~~~sh
mkdir -p evals/results
for n in 1 2 3; do
  claude plugin eval . --trust-plugin --model sonnet --runs 1 --judge-model sonnet -j 2 --no-publish --json "evals/results/claude-run-$n.json" --max-cost-usd 20
  node evals/run-codex.mjs --model gpt-6.1-sol --effort max --concurrency 3 --timeout-s 900 --json "evals/results/codex-run-$n.json"
done
node evals/summarize.mjs
~~~

The summarizer reads all `claude-run-*.json` and `codex-run-*.json` files in filename order. Use zero-padded numbers beyond nine runs to retain numeric order. Each agent needs at least one result file; if that agent has no run files, its `claude.json` or `codex.json` is used as a single-run fallback. Run files take precedence over legacy files. Dry-run plans are not scored results: keep them outside the run filename pattern. Use a separate `--root <repo>` checkout for a different batch; old matching run files also count.

**evals/summary.json** is the dashboard's behaviour-test input. Per agent it records `model`, `runs`, ordered `runMeans: [{with, without}]`, and cases with `{name, with, without, withScores, withoutScores}`. Case `with`/`without` values are pass counts out of `runs`: only a score exactly equal to 1 passes; fractional scores remain in the score arrays and per-run means. The summary date is the latest Claude run date. Models (including judge/effort) and case sets must match within each agent; the agents may have different run counts. Invalid JSON, invalid scores or malformed/inconsistent runs throw before writing, preserving any existing summary.

Codex also records `skillReadRates: {any, expected}`: shares over every with-arm case in every Codex run, regardless of its score. `any` counts a nonempty `arms.with.skillsRead` list; `expected` counts the existing `tool_used` grader's boolean `pass`. Older runs without a list or indicator retain their scores; a metric with any missing observations is `null` (shown as “未记录”), not zero.

After reviewing the summary, `node scripts/build-dashboard.mjs` regenerates the dashboard. The behaviour-test section shows each run's means, their mean across runs, case pass counts out of N, and the Codex skill-read shares. Existing single-run summary files still render their original score table.

Without --json the Codex runner prints its table only; temporary answers and JSONL streams are removed. With --json it preserves all existing fields (model/options, answers, individual grader verdicts, judge votes/reasons, elapsed times and execution errors) and adds `skillsRead` to each arm. That list includes only current wagerforge skill names, deduplicated in first-read order. A skill counts as read only when a command Codex ran to completion (an `item.completed` `command_execution` event with exit code 0) names its `.codex/skills/<skill>/SKILL.md`; a path in a command's output (such as a `find` listing), in a message or in reasoning is not a read. The expected-skill indicator uses the same rule. v0.3.0 counted any path mention in any event, so its expected-skill share (18 of 25) is not directly comparable. If execution fails before returning its event stream, the list is empty; if a later error occurs, already observed skills remain recorded.

~~~text
case | with | without | delta | skill-read | skills-read
~~~

Scores are weighted shares in [0, 1] over applicable regex/LLM graders. delta = with - without. Skill indicators are excluded from the denominator even if their frontmatter has a weight.

- with = 1 means every scored rule passed; without is the control score.
- Positive delta is an observed advantage on that case; zero can mean both arms already answered correctly. One run does not establish a statistical treatment effect.
- skill-read reports expected-skill with/without yes/no values; skills-read reports with/without counts of distinct wagerforge skills. In Codex both count a skill only when a command that ran to completion with exit code 0 names its .codex/skills/<skill>/SKILL.md; a command that reads several skill files through a glob is not counted, so the shares can undercount but do not count listings or mentions. In Claude the expected-skill indicator is the tool_used Skill invocation, not a scored ablation grader.
- Unparseable, ambiguous or duplicate-key judge replies count as FAIL with a reason. One well-formed JSON verdict can be recovered from surrounding prose/fences; pass must be a boolean and reason a nonempty string.
- Any with score below 1 exits 1. Execution errors in either arm also exit 1. An errored arm is recorded with failed graders; its numeric delta is not behavioural evidence. Judge-call errors count as failed votes under the same two-of-three policy.

## Case format

~~~text
evals/<case>/prompt.md
evals/<case>/graders/skill.md
evals/<case>/graders/rules.md
evals/<case>/graders/<optional-regex>.md
~~~

Each case has exactly one tool_used Skill indicator, one LLM grader applied to both arms, and at most one regex grader. Only c07 uses a regex: the unambiguous HMAC token. Prompts never name the plugin or the expected skill.

The zero-dependency parser supports top-level scalar key: value lines, LF/CRLF, quoted strings (quotes removed, escapes preserved), numeric/boolean scalars and inline lists, including quoted commas. It is deliberately not a general YAML parser: nested maps/block scalars are rejected. Unknown prompt/grader keys, duplicate fields, invalid grader types/weights/arms/regexes and unsupported targets fail closed.

Regex semantics on last_message: an omitted match requires a match; not_contains requires absence; count:N requires exactly N non-overlapping matches with the supplied flags, adding g for counting. Positive finite weights default to 1. Skill indicators validate the canonical input_match matching both bare and wagerforge-prefixed names; Codex's indicator is a path-presence boolean, not Claude invocation min/max counting.

## Coverage

Rules are derived from docs/specs/2026-06-04-wagerforge-design.md §7 and the job2/job3/job4/opusmax audit reports supplied for this implementation. The audits qualify the simplified C3 bonus arithmetic and C8 modulo statement; the expected rules intentionally test those corrections. Feature cases also follow the corresponding domain skills and are calibrated against the production server's reward boundaries.

| Case | Expected skill | Rule tested |
| --- | --- | --- |
| c01-reel-weight-rtp | math-rtp-modeling | Normalize changed weights; recompute complete RTP |
| c02-cached-balance | build-wallet-and-money | Authoritative guarded debit + atomic ledger; no replica authorization |
| c03-no-deposit-bonus | econ-bonus-design | Actual stopped turnover/cashflows; no WR-only profit claim |
| c04-high-volatility-sample | math-montecarlo-simulation | CI precision and about 1.53664 billion iid rounds for stated SD/tolerance |
| c05-mersenne-twister | comp-rng-certification | CSPRNG security; statistical tests/lab accreditation are insufficient |
| c06-path-dependent-retriggers | math-cascade-tumble | Closed-form assumptions versus state model/validated Monte Carlo |
| c07-sha256-length-extension | fair-rng-core | Plain commitment is valid; keyed outcomes use HMAC |
| c08-modulo-bias-scale | fair-outcome-mappers | Tiny uint32 % 37 bias versus large-range bias; rejection sampling |
| c09-certified-slot-animation | comp-rtp-certification | Certified server-authoritative audit model need not be commit-reveal |
| c10-draw-call-budget | build-mobile-performance | Device-tier profiling; no universal 500-call/256-MB gate |
| c12-reseed-between-bets | fair-rng-core | Secure HMAC epochs, unique tuples and safe rotation |
| c13-client-session-clock | comp-responsible-gaming | Authoritative monotonic timing; reconnect cannot reset enforcement |
| c14-production-rtp-change | comp-rtp-certification | Approved variants versus changed math/paytable; separate promos |
| r01-hidden-round-state | build-instant-crash-games | Persist complete internal state; redact client projection only |
| r02-parimutuel-rounding | build-prediction-market-games | Exact proportional payout per winner; atom-level residual allocation |
| f05-crash-one-target | math-crash-family | 1.00 equality bug; explicit instabust/target > 1; floor/cap effects |
| f06-sic-bo-profit-odds | math-table-game-edge | Profit odds 1:1 mean gross 2; RTP 210/216 |
| f13-rtp-ci-acceptance | qa-math-validation | CI containment, not target-in-CI compatibility |
| idem-settlement-content | build-durable-settlement | Immutable decision, loss terminal record, replay conflicts |
| stake-debit-before-result | build-durable-settlement | Accepted debit/reserve + OPEN + nonce before outcome; terminal rejection |
| nonce-epoch-contiguity | fair-verify | Player-saved commitment/client seed and contiguous accepted-bet epoch |
| verify-single-float | fair-verify | Exact first-13-hex no-counter derivation; frozen context adapter |
| j01-blitz-unique-win | math-plinko-lottery | All draws unique is the winning event; recompute RTP after multiplier rounding |
| j02-cluster-multiplier-grid | math-lines-ways-cluster | Pay from current cells at x2 or more, then activate/double for later waves |
| j03-paid-double-split | build-instant-crash-games | Double/Split debit new stakes before cards; Hit/Stand are free continuations |
| moving-wild-collector-order | math-moving-wild-collection | Move before refill; exclude covered coins; retain each wild's multiplier and horizon |
| cascade-orb-final-sum | math-cascade-modifiers | Preserve orbs; multiply accumulated spin wins once by the terminal sum, then cap |
| blackjack-split-21-grid-peek | math-blackjack-rules | Split 21 is no natural; natural premium floored per hand on the wallet grid; peek versus no-peek liability |
| blackjack-insurance-double-funding | math-blackjack-actions | Insurance is debited before the Double funding test; an unfunded Double takes its fallback; a three-card 21 pays 1:1 |

C11 shares the C7/C8 derivation and mapping coverage; there is intentionally no separate c11 case.

## Harness checks and API

~~~sh
NODE_OPTIONS=--max-old-space-size=2048 node --test evals/run-codex.test.mjs evals/summarize.test.mjs scripts/build-dashboard.test.mjs
~~~

Tests cover pure runner logic, local case contents and the result pipeline with a mocked child process; they never spawn Claude or Codex. The case-contract tests validate all 29 directories, required schema/settings, exact skill mappings, grader counts and explicit MUST-HAVE/disqualifying rules, plus README counts and complete coverage-table mappings. They do not claim those answers were generated by a model.

Exported helpers:

| Signature | Semantics |
| --- | --- |
| parseFrontmatter(source, allowedKeys?) | Return {fm, body}; preserve quoted escapes; reject malformed/duplicate/unknown fields |
| parsePrompt(source) | Validate prompt schema and numeric limits; return parsed metadata and exact body |
| parseGrader(source) | Validate type-specific metadata; add defaults, criteria or expected skill |
| gradeRegex(grader, answer) | Return boolean for last-message regex semantics |
| scoreArm(graders, arm) | Weighted scored pass share; exclude indicators and inapplicable arms |
| compareArms(withGraders, withoutGraders) | Return {with, without, delta} |
| skillRead(jsonl, skill) | Detect the exact expected skill path in valid JSONL |
| skillsRead(jsonl, skills) | List known skill names in first-read order from the same decoded JSONL paths |
| parseJudgeReply(reply) | Return {pass, reason}; malformed/ambiguous verdicts fail |
| judgeVerdict(votes) | Require three votes; return majority pass, votes and reasons |
| judgePrompt(criteria, answer) | Encode criteria and an explicitly untrusted answer as JSON |
| parseArgs(argv) | Validate CLI flags and return effective defaults/options |
| selectCases(names, glob) | Return sorted matching names; reject no matches |
| buildCommand(cwd, stdin, options?) | Return {command, argv, options, stdin}; pipe, no shell, detached group |
| processGroup(pid) | Return safe negative group id; reject pid <= 1/invalid values |
| validateCase(evaluation, skills) | Enforce one known Skill indicator, one both-arm judge, at most one regex |
| dryRunPlan(cases, options, base?) | Pure plan for two answer calls and six separate judge calls per case |
| exitCode(results) | Return 1 for empty/incomplete/error results, otherwise 0 |
| main(argv?) | Load cases, print dry plan or run/grade both arms, optionally write JSON; return exit code |
| summarize(claude, codex) | Accept one result object or an ordered array per agent; validate and aggregate runs |

The unit suite covers parser escapes/lists/unknowns, regex modes/flags/counts, weighted scores/deltas, ordered JSONL skill detection, strict judge parsing/majority votes, CLI defaults/errors, dry-run argv/stdin/workspace separation, process-group target construction, multi-run aggregation and dashboard rendering. Actual child spawning, OS timeout cleanup, CLI skill discovery and model grading require separate live execution; they are not certified by these local tests.
