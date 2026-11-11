# Career Evidence Platform — external validation 0.1.0

Profile: `career-evidence-platform/conformance@0.1.0`. The contract is pinned by
commit and blob in `contracts.lock.json` and references this profile through
`delivery.validation_profile`. The product contract specifies no adapter transport.

This compatibility correction amends suite 0.1.0 in place, keeping the profile
version and locked contract unchanged. Consumers must pin the new validation commit and
asset blobs before rerunning; earlier 0.1.0 evidence retains its original scope.
The candidate implementation and its adapter are updated separately.

The matrix maps all **114 normative clauses** (65 requirements, 10 invariants,
9 policies, 8 quality attributes and 22 acceptance scenarios) to **28 cases**.
The 22 contract scenarios are supplemented with usability, independent export
reading, latency, retention, actor permissions and deployment-boundary checks.
Mapping a clause is planned coverage, not proof that it has been satisfied.

## Run an implementation

Implement the six operations from [the adapter protocol](adapter.md), using the
candidate's public product/admin interfaces and disposable fixture-scoped resources.

```sh
npm run validate
npm run validate:career -- \
  --adapter /absolute/path/to/adapter-executable \
  --output /existing/parent/new-run-directory \
  --reviews /absolute/path/to/reviews/bundle.json \
  -- optional-adapter-arguments
```

For Node adapters, use the Node executable as `--adapter` and put the script
after `--`. `--timeout-ms` bounds each operation (default 30000). The output
directory must not exist. Required cases need external human evidence when
specified; a boolean from an adapter cannot establish accessibility or usability.
Missing evidence is `blocked`, unsupported optional modules are `not_run`, and
neither counts as passing. Exit code 0 requires all cases to pass.

`CEP-QA-006` (REQ-CEP-035, QA-CEP-006) treats the fixture counts as minimums:
4 entities, 3 typed links, 2 versions and 3 permission/availability markers,
both exported and read. Richer exports are accepted only with complete
reconciliation: all four `unreconciled*` counts must be zero. Self-contained
readable output, provider independence, reader identity, preserved corrections
and the external `export-reader` review remain required.

`CEP-ACC-004` (ACC-CEP-004, REQ-CEP-012) previews a split of the merged event
before undoing the merge, while both source observations are still present.
It checks per-group source attribution and compares the record before the split
preview with the record after cancellation, before undo. The final inspection
also checks that undo restored the original events and preserved concurrent work.

## Fixtures and harness controls

`fixtures/synthetic-career.json` contains fictional people, overlapping events,
conflicting sources, private-data canaries, a malicious document instruction,
versioned mappings, contribution permissions and legacy revocations. It exercises
mechanisms; it is not representative OCR or career-model evaluation data.

`positive-observations.json` and `replay-adapter.mjs` are synthetic controls for
the validator. The replay checks the action sequence and emits controlled
observations. It is not a product implementation. Even a passing control report
sets `corePassed` and `fullProfilePassed` to false.

```sh
npm run validate:career -- \
  --adapter /absolute/path/to/node \
  --output /existing/parent/new-control-directory \
  -- suites/career-evidence-platform/0.1.0/fixtures/replay-adapter.mjs
```

Without reviews, the expected control outcome is **22 pass, 6 blocked**, exit 1.
`npm test` also exercises synthetic review bundles and bad observations: data
leakage, false certification, duplicate charges, unwanted enrollment, mapping
promotion, erased-content restoration, false completion, incomparable evaluation
sets and blanket SOTA claims. Revision drift, cleanup, timeouts and evidence
integrity are checked too. These are harness self-tests, not consumer product results.
Export controls cover richer fully reconciled exports, incomplete reconciliation
and below-minimum content; split controls reject incorrect source groups and a
record changed by cancelling the preview. CEP-ACC-021 still requires human-rated
career relevance under QA-CEP-007.

## Evidence limits

Reports identify the locked contract, target revision, adapter version, command,
environment, timings, exact case claims, assertions and retained artifact hashes.
All reset attempts receive cleanup attempts. A missing field, unknown assertion,
changed revision, unredacted secret-like field or unconfirmed cleanup cannot pass.
The runner drains stderr without retaining it.

The adapter may consistently translate fixture IDs to opaque public IDs; it must
preserve domain meaning. Inspectors derive facts from actual actions, never from
expected observations. Review of this translation remains a trust dependency.
Case assertions provide fixture-scoped, partial evidence. Full WCAG assessment,
policy validity and production resilience are not inferred from synthetic data.
Source manifests remain `planned`; actual candidate reports belong under ignored
`reports/`, with their precise limits and unexecuted cases.
