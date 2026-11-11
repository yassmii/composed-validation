# Wealth advisory — suite 0.1.0

Target: **`wealth-advisory@0.1.0`**, format **0.2**, maturity **draft**.
Composed revision: `30956f542581d5ca80ff5b9fcd7c850a7143f413`.
Contract blob: `63ee2c21a1d928fa79207448de6d165d41d62f9c`.
Contract SHA-256: `d51dcabc5031a5f8cb75e374daeeef303c65e2821efd8670d9ced4c7c601265f`.

The [external profile](../../../profiles/wealth-advisory/0.1.0/profile.json) requires
26 acceptance groups, covering all **45 normative clauses** and the **26 acceptance
identifiers**. The [matrix](conformance-matrix.json) therefore contains 71 entries;
acceptance identifiers are not counted as additional normative requirements.

## What is available

- [Manifest](manifest.json): concrete context, actions, assertions, evidence and exact
  proof requirements for every acceptance scenario from the locked contract.
- **54 planned proof dimensions**: the contract's method × kind combinations at their
  declared boundaries. Negative, boundary, concurrency and recovery cases are retained.
- [Synthetic fixture](fixtures/synthetic-wealth.json): ownership, debt, envelope, currency,
  budget, adverse projections, roles, clocks, missing inputs and recovery conditions.
- [Adapter and review protocol](adapter.md), with an empty [review template](fixtures/review-template.json).
- Structural checks and adversarial mutations of proof metadata, plus independently
  reconciled integer-cent controls for the numerical fixture.

All groups and dimensions remain **planned**. There is **no wealth candidate runner
or adapter** here (`runnerAvailable: false`). `npm run validate` checks the immutable
lock, mapping, proof requirements, fixture and validators; it does not execute a
wealth-management application. There is no report of product conformance, legally
adequate advice, client acceptance or observed benefit.

## Preserved proof boundaries

`WAD-ACC-014` requires an external human review of the financial and insurance
reports, tied to the candidate and contract. A candidate-generated boolean cannot
replace it. `WAD-ACC-012` requires professional model-reference evidence before its
public-interface calculation can establish specialized-model coverage. No fiscal,
inheritance or retirement engine is supplied or presumed accurate.

Changing a public-interface requirement to a component check, dropping a negative
dimension, skipping core safeguards because AI is disabled, or omitting a required
case from the profile is rejected structurally. A complete static map still is
not executed proof. These checks validate the proof plan, not arbitrary natural
language semantics or the truthfulness of a future adapter.

## Using the suite

Install the locked validator dependency and run structural validation:

```sh
npm ci
npm run validate
```

Use `COMPOSED_WEALTH_ADVISORY_CONTRACT_PATH` to locate another Composed checkout.
Its Git object database must contain the locked revision; validation reads the
committed object, regardless of working-tree changes.

A future runner must execute every required dimension against an immutable candidate
through the [public adapter](adapter.md), retain sanitized observations and artifacts,
and handle required human evidence separately. Missing facilities or evidence stay
blocked or not_run. Before claiming compliance with the full external profile, inspect
the adapter translation and require all groups and dimensions to pass on that same
candidate revision; this does not promote the draft contract or certify a practice.

Future contract changes require a new immutable target/version and explicit impact
review. No old profile or consumer pin is migrated by this suite.

See the [author validation record](../../../docs/wealth-advisory-2026-11-04.md) for
commands, observed results, source fingerprints and remaining execution limits.
