# Agent OS 1.0.0 candidate suite

This suite targets the `agent-os` contract 1.0.0 (candidate, format 0.1) at Composed revision
`225959afc3836dc0fca86d8491e0c5f551071f6f`. The locked contract bytes have SHA-256
`098c6241428f09812ea59215b46e753e59f0ef3c9ace4b26b9ba6df20bb10f40`.

Every case is **planned**. No runner or adapter is supplied, so nothing here is a result. A project
that pins this contract can use the suite to see which cases an external judge would run and what
each one has to observe.

## What changes from 0.2.0

Contract 1.0.0 strengthens two requirements and adds two acceptance cases. All 69 clauses of 0.2.0
are retained; the suite extends the 0.2.0 suite rather than replacing it.

| Clause | Change in 1.0.0 | Proof in this suite |
| --- | --- | --- |
| REQ-AOS-012 | The final grant and policy check happens at the recorded transition to executing, after any queue or confirmation wait. A grant revoked or expired at that instant cannot authorise execution. | `AOS-ACC-019` (was `AOS-ACC-001`) |
| REQ-AOS-018 | Approval is also bound to the principal, tool identity and definition version, target scope and risk class. Approval never supplies a missing, expired or revoked grant. | `AOS-ACC-020` (was `AOS-ACC-004`) |
| ACC-AOS-019 | New | `AOS-ACC-019` |
| ACC-AOS-020 | New | `AOS-ACC-020` |

`AOS-ACC-001`, `AOS-ACC-004` and `AOS-ADV-003` keep their claims on the two strengthened
requirements. Their fixtures must be rebuilt against the 1.0.0 text, which the manifest marks with
`fixtureRevision: "1.0.0"`. A pass recorded against 0.2.0 does not transfer.

## The two new cases

### AOS-ACC-019: grant check at execution time

Claims ACC-AOS-019, REQ-AOS-012, INV-AOS-001, INV-AOS-002 and INV-AOS-007.

A permitted request waits in a queue or for confirmation, and its grant has an expiry `E`. The case
needs three separate fixtures:

| Fixture | Injected condition | Expected observation |
| --- | --- | --- |
| Revoked | The grant is revoked before the execution decision. | The target is never invoked. A denial is recorded with the decision time and the policy/grant revision. |
| Expired | The execution decision occurs exactly at `E`. | Same as revoked: a grant is valid only strictly before its expiry. |
| Control | The grant is unchanged and unexpired. | The target is invoked exactly once. |

A request that had already entered execution when its grant was revoked must be reported as such.
The implementation must not claim that its external effect was undone.

Evidence: controlled-clock queue and confirmation traces, target invocation counts and grant
histories.

### AOS-ACC-020: approval bound to the presented action

Claims ACC-AOS-020, REQ-AOS-018, REQ-AOS-012 and REQ-AOS-032.

A principal approves one exact action that no standing grant covers. Independent fixtures then
change one thing before execution:

| Fixture | Changed before execution | Expected observation |
| --- | --- | --- |
| Tool version | The tool definition version | The action waits for a new principal confirmation. |
| Scope | The target resource scope | Same. |
| Risk class | The risk class | Same. |
| Input | One input value | Same. |
| Replay | Nothing | The authorised action executes exactly once. |

In every changed fixture the action still needs a current capability grant. In every fixture,
another principal or an operator cannot approve the action.

Evidence: approval presentations, bound action identities, target invocation records and the
principal/operator negative controls.

## What an adapter needs

The profile requires the six standard operations: `describe`, `reset`, `execute`, `inspect`,
`inject` and `dispose`. The two new cases add three needs on `inject`:

- set or advance the clock, so that a decision can be placed exactly at a grant's expiry;
- revoke a grant while a request is queued or awaiting confirmation;
- change a tool's definition version, a target scope or a risk class between approval and execution.

These go through `inject` only. An adapter that edits the candidate's stored state directly is not
a black-box adapter, and a candidate that cannot expose these controls reports the case `blocked`.

## Limits

- The contract is a candidate. Independent review and stable promotion have not happened.
- Format 0.1 has no structured acceptance-to-requirement links. Coverage is established by the
  matrix in this suite, which is an author's reading of the contract text.
- `delivery.verification` in the contract still names "ACC-AOS-001 to ACC-AOS-018 tests"; its last
  item covers every retained and added case. This suite follows the latter and requires all twenty.
- Optional modules (`aos.computer-use`, `aos.multi-device`, `aos.retention`) have no cases here.
