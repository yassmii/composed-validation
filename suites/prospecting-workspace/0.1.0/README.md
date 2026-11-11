# Prospecting Workspace — external validation 0.1.0

Profile: [`prospecting-workspace/conformance@0.1.0`](../../../profiles/prospecting-workspace/0.1.0/profile.json).
The contract is pinned in `contracts.lock.json` to Composed commit
`3b6372dada8dd10ad4eb474ae77620ad4699a37f`, blob
`f50d3b25f69990ce91b4f35d9b46a34e0fea4f4d`.
This is an independent consumer profile. The locked product contract does not
declare a `delivery.validation_profile` or prescribe this adapter protocol.

The matrix maps all **118 normative clauses** (57 requirements, 12 invariants,
9 policies, 8 quality attributes and 32 acceptance scenarios) to **35 planned
cases**. The 32 acceptance cases are supplemented by separate accessibility,
reference-load and usability cases. Each proof explicitly claims its clause.
Steps and assertions are reviewable scenario specifications, not executable code.
There is no prospecting runner or candidate adapter in this scaffold yet.

## Candidate boundary

Implement the six operations in [the common protocol](../../../docs/adapter-protocol.md)
and [the suite-specific guidance](adapter.md). Use documented public product/admin
operations, disposable workspaces and controlled source/transport destinations.
The suite chooses no product route, storage engine, identity provider, rule
language, model or delivery vendor. No real campaign or outbound contact is needed.

Adversarial cases cover invalid profiles, untrusted inbound content, shared
contacts, ambiguous identity, unknown mandatory evidence, approval invalidation,
opposition/revocation at provider handoff and unauthorized direct/indirect access.
Resilience cases cover partial sources, budgeted resume, concurrent edits,
remote acceptance followed by a lost acknowledgement/local write, duplicate and
unordered events, suppression after reimport and erasure before restored service.

The adapter must not inspect candidate internals or manufacture observations
from expected assertions. If a public test dependency cannot reproduce a fault,
record `blocked` and explain the boundary. Planned or blocked checks do not pass.

## Synthetic reference data

`fixtures/synthetic-prospecting.json` defines fictional actors, two workspaces,
shared-contact targets, independent campaign dossiers, a project with no address
or email, evidence conflicts, a dated wait, test messages, suppression, import
rows, private-data canaries, test budgets and daylight-saving/retention clocks.
Opaque candidate identifiers may differ; preserve their fixture domain meaning.

`fixtures/profiles/` contains exact copies of the three illustrative Composed
profiles at the locked revision, with provenance and SHA-256 hashes recorded in
the fixture. Keep these originals inactive. For each run, validate disposable
clones with explicit fixture business parameters, offers, source permissions,
synthetic compliance policy, budgets and publication thresholds. The synthetic
policy and ten-day retention setting authorize no real-world processing and
define no universal retention rule. The live contract and its linked
`targeting-profile.md` remain the normative source.

Configure a controlled source outside the candidate's product boundary for
external-source tests, plus an independent transport ledger and destination
monitor. A mock source proves connector behavior under its declared conditions;
it does not prove live registry access, data coverage or delivery effectiveness.

## Quality and external evidence

The following requirements need actual target-bound artifacts:

| Cases | Evidence and locked thresholds |
| --- | --- |
| PR-QA-001, PR-ACC-030 | Automated and manual WCAG 2.2 AA audit of configuration, search, inbound form, qualification and follow-up; keyboard alternatives, announced errors/status, reflow at 320 CSS pixels and 200% zoom. |
| PR-QA-002, PR-ACC-030 | 100,000 dossiers per workspace and 50 simultaneous users; p95 ordinary reads, filters and saves at most 2,000 ms, long-operation acknowledgement at most 2,000 ms; sanitized timing samples and workload/environment metadata. |
| PR-QA-008, PR-ACC-030 | At least five representative users and at least four completing selection, qualification examination and next-action planning without help; task results, time, errors and small-sample limitations. |
| PR-ACC-020, PR-ACC-021, PR-ACC-024 | Authorization coverage, verified transit/storage protection, deployment-policy attribution, actual transfers, data minimization and rights/erasure evidence. |
| PR-ACC-028, PR-ACC-029 | Independent semantic export/reimport reconciliation and a timestamped recovery exercise against objectives declared before the run. Every exported item reconciles; richer exports are allowed. |
| PR-ACC-031 | Authorized held-out corpus, annotations/disagreements, simple baseline on the same cases, prior business-owner thresholds, per-profile quality/coverage, abstentions, cost, p50/p95 latency, regressions and release/rollback decision. |

A small functional fixture cannot establish the reference-load threshold. A replay
cannot substitute for representative users, an accessibility audit, a held-out
quality study or deployment-policy review. Missing evidence blocks the claim.
The contract defines no universal precision target, recovery time, business
budget, cadence, sales gain or global recall over an unknown universe.

## Applicability and reporting

PR-ACC-019 applies to enabled/advertised sequences (CAP-PR-010), PR-ACC-025
to AI (CAP-PR-013), and PR-ACC-032 to monitoring (CAP-PR-017). PR-ACC-018
applies when email is enabled/advertised. Unsupported optional cases are
`not_run`, with the capability/channel declaration and exact coverage retained.

Mixed scenarios remain core: untrusted form content in PR-ACC-008 and missing
policy in PR-ACC-021 must be checked without AI. The manual journey in
PR-ACC-026 always runs; only its model fault phases are conditional. AI context
in PR-ACC-020 and the provider cascade phase of PR-ACC-032 apply when offered.
Record each unexecuted phase explicitly; it cannot be relabelled as passing.

Every applicable core and enabled optional case must pass for its stated claims.
A bounded core report documents disabled modules; it cannot claim execution of
all 35 profile cases while required cases remain unexecuted.

Retain the command, environment, immutable target and adapter versions, timestamps,
claimed clauses, applicability decisions, observations, verdicts and sanitized
artifact hashes using [the evidence model](../../../docs/evidence-model.md).
Keep generated reports under ignored `reports/`. `npm run validate` verifies the
lock, coverage, profile and validator tests. It does not execute a prospecting
candidate; all source case/matrix records remain `planned`.
