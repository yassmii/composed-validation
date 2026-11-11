# Evidence model

## Read a career run

The career runner prints a compact summary and writes `report.json` plus its SHA-256 beside the
retained artifacts. Start with the target and verdict, then inspect only the cases requiring action.

| Report field | Read it as | Next action |
| --- | --- | --- |
| `target.kind` | `candidate` is an implementation; `harness-control` is a synthetic validator control. | A control result can validate the checker exercise, not your product. |
| `contract`, `target.revision`, `profile` | The exact contract, candidate revision and profile assessed. | Compare with the intended target before reusing this report. |
| `verdict: fail` | At least one observed check failed. | Find the failing case/assertion or cleanup reason, correct the cause, then run into a new directory. |
| `verdict: blocked` | A required input, execution capability or external review is missing. | Read top-level `reason` and blocked case reasons; supply that missing evidence or capability. |
| `verdict: not_run` | Required profile coverage remains unexecuted, for example an unsupported optional module. | Keep the gap explicit; complete execution before a full-profile claim. |
| `verdict: pass` | The run's cases passed. | Check `target.kind` and `fullProfilePassed` before interpreting this as candidate evidence. |
| `summary` | Counts of `pass`, `fail`, `blocked` and `not_run`. It can be absent if startup was blocked. | Inspect case reasons, not just a total or a percentage. |
| `fullProfilePassed` | True only for a candidate with every required case passing. | Keep the report's revision, coverage and environment limits with any claim. |

Several statuses can coexist among cases. The overall verdict gives failures precedence, then
blocked cases, then unexecuted cases. A failing run can therefore also have missing reviews.
`corePassed` does not replace `fullProfilePassed`; neither certifies user benefit or production fitness.
The CLI exits 1 for fail/blocked/not_run. A harness control can exit 0 while both conformance flags
remain false, so exit status alone is insufficient.

For example, the documented replay control without external reviews yields **22 pass / 6 blocked**,
exit 1, `fullProfilePassed: false`. The next step for a real candidate is to supply its adapter and
obtain the six actual reviews; copying synthetic review data would not establish them. See the
[runnable control](../suites/career-evidence-platform/0.1.0/README.md#fixtures-and-harness-controls).

For a new candidate revision, preserve the old report and obtain evidence for the new one. The
hash identifies retained report bytes; it does not by itself establish that an old report still
applies. No product cases are run by `npm run validate`, which checks this repository and its validators.

## Evidence contents

A suite result is evidence only when it is reproducible and attributable. Generated
records are written under `reports/` and include:

- suite ID, case ID, and each claimed contract clause;
- contract version and locked revision;
- implementation identity and immutable target revision;
- adapter version and command line;
- sanitized environment profile and isolation mode;
- start and finish time, verdict, and reason;
- hashes and paths of retained sanitized artifacts.

Allowed verdicts are `pass`, `fail`, `blocked`, and `not_run`. `planned` is permitted
only in source manifests and conformance matrices; it is never an execution verdict.

No result may claim contract-wide conformance. Reports state the exact covered clauses,
case versions, environmental limits, and unexecuted cases. A release-level conformance
claim needs all required cases executed against the same target revision.
