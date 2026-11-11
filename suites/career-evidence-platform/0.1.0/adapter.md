# Adapter operations and external review evidence

The runner exchanges one UTF-8 JSON object per line over stdio, without a shell.
It forwards only PATH, platform/temp variables, LANG and TZ. `reset` creates any
fixture credentials. Never use production credentials, write candidate internals,
or read expected assertions to fabricate observations. Reserve stdout for JSONL;
stderr is drained without retention. Do not pass secrets in command arguments.

Request example:

```json
{"requestId":"4","operation":"execute","tenantId":"opaque-test-tenant","caseId":"CEP-ACC-001","name":"start","arguments":{"sourceIds":["cv-a"],"defer":["questionnaire","testimony","goal"]}}
```

Response example:

```json
{"requestId":"4","ok":true,"operationId":"operation-4","targetRevision":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","startedAt":"2026-10-21T10:00:00.000Z","finishedAt":"2026-10-21T10:00:00.100Z","result":{"started":true},"diagnostics":[]}
```

Every response has this envelope. The target revision is an immutable Git commit
(40 hex), SHA-256 digest (64 hex), or `sha256:` image digest, identical throughout
the run. `ok:true` means the adapter completed its operation, including observing
a domain denial. A forbidden action normally returns that denial within `result`.
Secret-like fields must be omitted or redacted, including in diagnostics.

| Operation | Payload | Result |
| --- | --- | --- |
| `describe` | None | `name`, `adapterVersion`, `kind` (`candidate` or `harness-control`), `isolationMode:disposable`, `contracts:[{id,version}]`, `suites:[id]`, `capabilities:[CAP-*]` |
| `reset` | `caseId`, complete synthetic `fixture`, `testMode:true` | Opaque `tenantId`, `isolationMode:disposable` |
| `execute` | Tenant, case, action `name`, `arguments` from manifest | Actual action result; observe/await longer work as specified by the scenario |
| `inspect` | Tenant, case, name equal to case ID | Normalized public observation object consumed by that case's assertions |
| `inject` | Tenant, case, named fault | Applied fault, or `ok:false,result:{code:unsupported_fault}` / `not_reproducible` |
| `dispose` | Case ID and tenant, or null when reset failed | `disposed:true` only after cleanup; reconcile interrupted resets using case ID |

Core cases always run. Absent optional capabilities CAP-CEP-007/011/012/013 give
their cases `not_run`. Advertised modules require their complete safeguards.
CEP-ACC-008 exercises direct actions and resume even without conversational UI;
the conversation switch applies only when offered. Composite action names are
public journeys, not permission to synthesize private state. Unknown faults are
blocked, unsupported core actions fail, and results must preserve attribution.

Assertions and expected normalized fields are in `manifest.json`. `equal` is
strict; missing fields fail even when null is expected. `not_contains` requires
a real string. `nonempty`, numeric bounds, twenty-request p95 and comparable
evaluation metrics are implemented in `src/career-checks.mjs`. Adapter round-trip
latency includes its overhead and does not measure browser rendering. Accuracy
rates are reported measurements, not invented passing thresholds.

For `CEP-QA-006` (REQ-CEP-035, QA-CEP-006), `expectedEntities`,
`expectedTypedLinks`, `expectedVersions` and `expectedMarkers` count the complete
structured export. The corresponding `read*` counts come from the independent
reader. Both sets must meet the fixture minimums (4/3/2/3); they are not fixed
export totals. Supply `unreconciledEntities`, `unreconciledTypedLinks`,
`unreconciledVersions` and `unreconciledMarkers` as non-reconciled exported items
in each category, derived by comparing the actual export with the reader result.
Every exported item must reconcile, including its identity and relevant content;
matching counts alone do not establish reconciliation. All four counts must be
zero. The external `export-reader` review remains required.

For `CEP-ACC-004` (ACC-CEP-004, REQ-CEP-012), `preview-split` targets the event
produced by `confirm-merge`, before `undo-merge`. Preview two groups using the
observations from `cv-a` and `contract-a` respectively. Normalize
`splitPreviewSourceIds` to `[["cv-a"],["contract-a"]]` in that fixture group order,
translating opaque public identifiers as needed. Retain the actual preview
observation through the final inspection. Derive `recordUnchangedAfterCancelSplit`
by comparing public career-record snapshots before `preview-split` and after
`cancel-split`, before `undo-merge`; compare event identities, source links,
observations, revisions and dependent outputs. Exclude transient preview state
and operation telemetry. `undo-merge` then restores the original event identities.

## External review bundle

Supply reviews with `--reviews /path/to/bundle.json`, from an independent review
step. The adapter cannot approve itself. Every review targets the same candidate
and locked contract, names a reviewer, actual method and date, and references
nonempty sanitized artifacts with real SHA-256 hashes. Artifacts must remain
inside the bundle directory, including symlink resolution; retained copies are
hashed again. Missing or changed artifacts block the case; reviewer failure
fails it. The following placeholders deliberately do not form valid evidence:

```json
{
  "format":"career-review-bundle/v1",
  "targetRevision":"REPLACE_WITH_CANDIDATE_DIGEST",
  "contractRevision":"REPLACE_WITH_LOCKED_COMPOSED_COMMIT",
  "reviews":[{
    "caseId":"CEP-ACC-022","kind":"accessibility",
    "reviewer":"REPLACE_WITH_REVIEWER","method":"REPLACE_WITH_ACTUAL_METHOD_AND_SCOPE",
    "performedAt":"REPLACE_WITH_ISO_TIMESTAMP","verdict":"REPLACE_WITH_PASS_OR_FAIL",
    "artifacts":[{"path":"sanitized-assessment.pdf","sha256":"REPLACE_WITH_REAL_SHA256"}]
  }]
}
```

| Case / review kind | Substantive evidence to supply |
| --- | --- |
| CEP-ACC-010 / `career-relevance` | Human relevance, explanations, constraints and usefulness of next actions |
| CEP-ACC-021 / `evaluation-corpus` | Annotation and corpus policy, held-out split, separate metrics, uncertainty, versions, cost/latency, regressions and population limits |
| CEP-ACC-022 / `accessibility` | WCAG 2.2 AA assessment of declared journeys/modules, keyboard, non-graphical access, labels, asynchronous status and findings |
| CEP-QA-001 / `usability` | Representative population, first-time task observations, time, errors, help, participants without recommendation letters |
| CEP-QA-006 / `export-reader` | Export hashes, independent reader/environment and performed recipe, entity/link/version/permission reconciliation and readable output |
| CEP-POL-007 / `deployment-boundary` | Deployment choices separate from generic requirements, providers/regions, authority and operational/policy artifacts |

Usability also supplies `data.population` and `data.participants`: distinct
pseudonymous `id`, `firstTime:true`, nonnegative `activeSeconds`, `waitingSeconds`,
`helpCount`, `errorCount`, `hasRecommendationLetters`, `completedTasks` per row.
Successful rows complete `intake`, `inspect`, `correct`, `prepare-share` in at
most 900 active seconds without facilitator help. At least ten first-time
participants, 80% success and a participant without recommendation letters are
required. These are the draft contract's proposed thresholds, not measured results.

The runner verifies evidence integrity and attribution. It cannot establish that
a dishonest reviewer observed real people or correctly applied every WCAG
criterion. Reviewer judgments and adapter translation remain reviewable trust
dependencies, distinct from automatic assertions.
