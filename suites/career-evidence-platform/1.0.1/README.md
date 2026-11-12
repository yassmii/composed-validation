# Career Evidence Platform — external validation for contract 1.0.1

Profile: `career-evidence-platform/conformance@1.0.0`, for the contract
`career-evidence-platform@1.0.1` (candidate), pinned by commit, blob and SHA-256
in `contracts.lock.json`. The contract names this profile under
`delivery.validation_profile`.

This suite **extends 0.1.0**. It inherits its 28 cases, matrix, review rules and
[adapter protocol](../0.1.0/adapter.md) unchanged, and adds two cases for the two
clauses the contract strengthened. Suite 0.1.0 and its profile are not modified:
an implementation pinned to contract 0.1.0 keeps its existing judge.

The matrix maps all **116 normative clauses** (the 114 of 0.1.0 plus ACC-CEP-023
and ACC-CEP-024) to **30 cases**. Mapping a clause is planned coverage, not proof.

Contract 1.0.0 introduced the two strengthened clauses but still named profile
0.1.0, which cannot judge them. Contract 1.0.1 is a patch that changes only that
reference, so this suite targets 1.0.1; there is no separate suite for 1.0.0.

## What changed in the contract since 0.1.0

| Clause | Strengthened obligation | Case |
| --- | --- | --- |
| REQ-CEP-063 | Every measure names its task, population, sample count, numerator and denominator or scoring definition, and missing observations. An undefined denominator or unexecuted slice is unknown, never zero or success. Abstentions are reported apart from supported answers. | `CEP-ACC-024` (ACC-CEP-024) |
| REQ-CEP-064 | Corpus, split, slices, scoring rules and thresholds are frozen before comparison. All declared slices and regressions are published; an aggregate gain cannot override a failed mandatory threshold. Tuning cases are not the confirmation split. | `CEP-ACC-023` (ACC-CEP-023) |

`CEP-ACC-021` keeps its claims on REQ-CEP-063, REQ-CEP-064 and QA-CEP-007 and its
required `evaluation-corpus` review. The two added cases are automatic negative
controls of the evaluation tooling; they do not replace that review.

## Added adapter actions

Both cases use this suite's fixture, `fixtures/synthetic-career.json`
(`synthetic-career-v2`): the 0.1.0 fixture plus `evaluationControls`. The adapter
feeds those known inputs to the candidate's own evaluation tooling and reports
what that tooling produced. It must not compute the expected values itself.

### CEP-ACC-024 — scorer controls

Action `score-extraction-controls`, then `inspect`. Inputs are under
`evaluationControls.scorer`:

- `known`: five gold spans and four predicted spans, three of which match;
- `allAbstention`: three cases on which the method abstains;
- `unexecuted`: two declared cases with no observation.

Observation consumed by the `scorer_controls` assertion:

| Field | Requirement |
| --- | --- |
| `matchingRule` | Nonempty text naming the declared span-matching rule. |
| `known.counts` | `truePositive` 3, `falsePositive` 1, `falseNegative` 2. |
| `known.precision`, `known.recall` | `{numerator, denominator}` equal to 3/4 and 3/5. |
| `allAbstention` | `caseCount` 3, `abstentions` 3, `supportedAnswers` 0, and `supportedAnswerQuality` unknown. |
| `unexecuted` | `observations` 0, with `precision` and `recall` unknown. |
| `separateMeasures` | Exactly `extraction`, `linking`, `grounding` and `relevance`, each `{task, status}`; `reported` needs a positive `sampleCount`, otherwise unknown. |

Unknown means `{"status":"unknown","value":null}` (or no `value`), with no
numerator or denominator. A zero, a one or any number there fails the case.

### CEP-ACC-023 — slice confirmation

Actions `freeze-confirmation-declaration`, `compare-on-confirmation-split`,
`attempt-include-tuning-cases` (with the fixture's tuning case IDs),
`attempt-drop-slice` (`fr/care`), then `inspect`. Inputs are under
`evaluationControls.confirmation`: three slices with per-slice baseline and
candidate outcomes. The aggregate improves from 18/25 to 23/25 while `fr/care`
falls to 3/5, below its mandatory minimum of 0.8.

Observation consumed by the `slice_confirmation` assertion:

| Field | Requirement |
| --- | --- |
| `declaration` | `frozenBeforeComparison` true; nonempty `corpusId`, `splitId`, `scorerVersion`, `thresholdsVersion`; `slices` listing the three declared slices. |
| `slices` | One row per declared slice with its `sampleCount` (10, 10, 5), `baseline`, `candidate` and `mandatoryMinimum` rates, and `passed` consistent with `candidate >= mandatoryMinimum`. |
| `aggregate` | `baseline` and `candidate` rates, the candidate higher. |
| `verdict`, `regressions` | `not_confirmed`, and `regressions` includes `fr/care`. |
| `tuningCasesAttempt`, `dropSliceAttempt` | `accepted` false for both. |
| `tuningCasesInConfirmation` | 0. |

## Run an implementation

```sh
npm run validate
npm run validate:career -- \
  --contract-version 1.0.1 \
  --adapter /absolute/path/to/adapter-executable \
  --output /existing/parent/new-run-directory \
  --reviews /absolute/path/to/reviews/bundle.json \
  -- optional-adapter-arguments
```

Without `--contract-version` the runner keeps judging 0.1.0. The adapter's
`describe` must list contract `career-evidence-platform` version `1.0.1` and suite
`career-evidence-platform/1.0.1`. The review bundle names the 1.0.1 lock's
contract revision. Everything else follows the [0.1.0 guide](../0.1.0/README.md).

Results obtained on 0.1.0 remain attached to 0.1.0. A complete verdict
needs a full run of the 30 cases on the adopting implementation.

## Harness controls

`fixtures/replay-adapter.mjs` replays the 0.1.0 recording for inherited cases and
`fixtures/positive-observations.json` for the two added ones. It is a validator
control, not a product: a passing control report keeps `corePassed` and
`fullProfilePassed` false. Without reviews the expected control outcome is
**24 pass, 6 blocked**, exit 1.

`npm test` rejects, at the affected case: a confirmed verdict despite the failed
slice, a dropped or relabelled slice, a hidden sample count, accepted or leaked
tuning cases, a late declaration, a wrong precision, a zero or a number standing
in for an unknown, abstention reported as quality, and merged task measures.

## Evidence limits

These controls check that evaluation tooling handles known inputs honestly. They
say nothing about the quality of any model, corpus or annotation. Representative
multilingual corpora, independent annotation and real quality, cost and latency
measurements remain outside this suite, as the contract's proposal states. The
adapter's translation of the fixture into the candidate's tooling remains a
reviewable trust dependency.
