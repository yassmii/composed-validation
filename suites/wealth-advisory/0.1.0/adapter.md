# Wealth advisory adapter and review boundary

This is a planned black-box boundary. No candidate adapter or runner is delivered.
The operations below extend the repository's [adapter convention](../../../docs/adapter-protocol.md)
for this suite; they impose no transport or technology on the product contract.

## Public operations

| Operation | Required meaning |
| --- | --- |
| `describe` | Name adapter version, immutable target, draft contract/profile, exposed public interfaces and reproducible test facilities. |
| `reset` | Establish isolated, disposable fixture dossiers, cabinets, people, roles, service profiles and controlled dates through supported public setup operations. |
| `execute` | Translate a named manifest action to real public operations: collect, calculate, simulate, recommend, validate, hand over, decide or review. |
| `inspect` | Return the actual public response, exported report, version reference, access result or permitted event history. Retain provenance and units. |
| `inject` | Invoke a documented public test facility for a clock, failed delivery, stale revision, fault, concurrency or restore condition. Unsupported injection is blocked. |
| `dispose` | Confirm cleanup of every disposable resource created for the case; unconfirmed cleanup cannot be reported as successful. |

The adapter must not import private implementation modules, write the database,
change permissions outside public administration, fabricate report contents, or
derive candidate observations from the suite's expected results. A public admin
operation is still permission-scoped. Real-client data and live financial or
transmission effects are outside this suite.

## Data translation and independent checks

Fixture monetary values use decimal strings to preserve cent-level expectations.
An adapter may translate them to the product's public representation, retaining
original currency, valuation date, ownership and debt allocation. It must expose
enough detail for an external checker to reconcile totals, not return only a
`compliant: true` field. Project-level choices of decimal representation or storage
remain free.

The property/debt split, envelope decomposition, annual budget, foreign-currency
conversion and adverse projection have explicit expected values in the fixture.
Those controls check the prepared reference arithmetic, not the actual candidate.
No debt allocation rule, fiscal rate or estate valuation is inferred from these
fixtures. Unsupported specialized models remain unavailable.

`WAD-ACC-025` must exercise the stale-revision condition at validation/remise,
including an actual interleaving of authorized clients. `WAD-ACC-023` must perform
a controlled restore and erasure-after-backup exercise. An adapter boolean, a
replayed transcript or a document describing an intended restore cannot substitute
for those observations. The public facilities and their isolation must be inspected
before a future runner claims these cases executable.

## Required evidence and verdicts

Each result identifies case and proof-dimension ID, contract revision/blob/SHA-256,
profile and manifest hashes, candidate immutable revision, adapter version, exact
command, environment, boundary, method, kind, timestamps, observations, verdict,
limits and nonempty artifact hashes. Logs must exclude credentials, real personal
data and unnecessary report contents. Share only authorized synthetic artifacts.

Allowed execution verdicts are pass, fail, blocked and not_run. Planned is source
metadata, never an execution result. Preserve each required dimension; neither an
average nor a passing component test replaces a failed public-interface case.
AI absence skips no required core group, and AML/asset-freezing absence never
receives a compliance status.

## Human review and specialized models

For `WAD-ACC-014`, the reviewer examines the actual candidate's retained financial
and insurance reports. Record reviewer and author, their distinct contexts, date,
method, findings, scope, verdict and hashed reports/checklist. Bind this evidence to
the contract and target identities. Identity fields are declarations, not authentication.
Missing review or unavailable reports block the case; no sample pass is provided.

For `WAD-ACC-012`, identify the specialized model, covered situations/periods, reference
cases and their professional review. Missing professional/model evidence prevents a
coverage claim even when generic arithmetic succeeds. The external reviewer does not
grant the software a professional status or waive the cabinet's legal obligations.

The review template deliberately contains no target or accepted review. Any future
evidence reader must reject that template as execution evidence. Meaningful product
judgment and legal/model review remain with the identified qualified professionals.
