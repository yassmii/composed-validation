# Prospecting adapter and evidence guidance

Use [the common adapter operations](../../../docs/adapter-protocol.md). This
document describes a validation boundary; it adds no interface to the product
contract and defines no executable prospecting transport or runner.

| Operation | Prospecting translation |
| --- | --- |
| `describe` | Immutable target revision, adapter identity/version, supported contract/suite, disposable isolation, enabled/advertised capabilities, channels and declared limitations. |
| `reset` | Clean fixture workspaces, scoped identities, synthetic source/transport endpoints and immutable profile clones. Return opaque public identifiers and their fixture mapping. |
| `execute` | The public journey named in the case steps: configuration, discovery, intake, identity review, qualification, follow-up, approval, handoff or rights request. Record real outcomes, including domain denials. |
| `inspect` | Read-only normalized public records, attributed decisions, histories, execution/budget state, rights and export artifacts. Retain independent destination/provider observations where required. |
| `inject` | A declared, isolated test-dependency fault, controlled clock, concurrent-client barrier or public cancellation. No private database edits or fabricated success responses. |
| `dispose` | Clean all fixture workspaces, queued work, tokens, provider-side test operations and destinations; report incomplete cleanup. |

Use fixture-scoped credentials and test-only destinations. Sending to a controlled
transport tests handoff integrity; it makes no inbox-placement or real-world
contact-permission claim. Redact secrets and unnecessary personal content from
diagnostics before retaining them. The profile itself is untrusted content for
the purpose of product permission checks (REQ-PR-004, INV-PR-011).

## Identity, time and external effects

Preserve distinctions between entity identity, contact relationship, campaign
dossier, qualification, pipeline and contactability (INV-PR-002). Do not compare
opaque random identifiers between candidates; compare their typed relationships,
version references and attributed domain state. Shared contacts and shared names
must remain testable without forcing target identity equality.

Use a declared public test-clock boundary or a reproducible scheduling recipe for
retention and DST cases. Record both offsets for the repeated local time in the
fixture, the actual due instant and zone; unavailable time control is `blocked`
for that attempt. Artificial fixture retention/cadence values are test parameters.

For PR-ACC-016, hold the test transport before handoff, confirm opposition or
revocation, then release it. Independently record confirmation, last authorization
check and handoff order. Exercise missing policy, permission, relationship,
approval and quota separately. Do not infer a denied transmission solely from
the candidate's UI state (REQ-PR-029, QA-PR-005).

For PR-ACC-017, the provider ledger must show acceptance before acknowledgement
loss or local-record failure. Retain stable operation/event identities and the
count of actual handoffs before and after recovery. Also use a provider incapable
of deduplication/reconciliation to verify suspended retry. Distinguish accepted,
delivered, failed and unknown; do not substitute a pre-send timeout for this
post-effect fault (REQ-PR-030, REQ-PR-050, INV-PR-007).

For PR-ACC-024/029, restore only in isolation and observe the service-release
boundary. Erasure and suppression must be reapplied before restored service or
contact resumes, including projections and applicable processors. Verify failures
and incomplete propagation through public results; a declared exception does not
permit active commercial reuse (REQ-PR-039 to REQ-PR-041, QA-PR-006).

For PR-ACC-028, independently inventory every exported authorized entity,
relationship, dossier, profile/version, accessible evidence item, evaluation,
activity, deadline and restriction. Reimport and reconcile semantic content and
links, including the suppression outcome. Fixture counts are not fixed totals;
omitted, mismatched or reactivated items fail reconciliation (REQ-PR-049).

## External review and measurement artifacts

Use an attributable reviewer or measurement operator for every case's
`evidenceRequired` artifacts. Record the target/contract revisions, case and
clauses, reviewer/operator, performed method, environment, date, scope, findings,
verdict and sanitized nonempty artifact paths with SHA-256 hashes. Retain the
actual bytes and verify their hashes; absent, changed or inaccessible evidence is
`blocked`. An adapter boolean cannot establish substantive review.

PR-QA-002 requires actual load generation and timestamped latency distributions
for each ordinary operation class and long-work acknowledgements. State the
dataset, user concurrency, workload mix, sample counts, duration, warm-up and
measurement boundary. Measure the public operation end to end; identify adapter
overhead and do not omit slower classes behind one blended p95 (QA-PR-002).

PR-QA-008 requires distinct actual representative participants with their
population/context, completed tasks, assistance, time and errors. At least four
of at least five participants complete all three tasks without help. These are
the contract's fixed minimums; this suite adds no universal time or success-rate
threshold (QA-PR-008).

PR-ACC-031 retains a frozen corpus and a baseline on the same held-out cases,
annotation rules/disagreements, sample sizes, prior business-owner publication
and regression thresholds, method versions, per-profile measurements and a
release/withdrawal decision. Report precision/recall only where ground truth
permits; use known coverage otherwise. Qualification and drafting remain separate,
as do technical quality and commercial outcomes (REQ-PR-052 to REQ-PR-054).
