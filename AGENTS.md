# Composed Validation repository guide

This repository is an independent consumer of versioned Composed contracts. It contains
conformance, resilience, adversarial, and benchmark evidence; it is not a second source
of product requirements.

## Rules

1. Read `contracts.lock.json` before changing a suite. A suite targets one immutable
   contract revision and content blob.
2. Every normative test or matrix entry cites a `REQ-*`, `INV-*`, `POL-*`, `QA-*`, or
   `ACC-*` identifier from that locked contract.
3. Do not add product behaviour here. Propose missing product requirements in Composed.
4. Keep an implementation under test black-box. An adapter translates the validation
   protocol to its public interface; a suite must not import the candidate's internals.
5. A planned, skipped, or non-reproducible check is not validation. Evidence records
   must name command, environment, target version, timestamp, result, and artifact hash.
6. Never lower a passing threshold or remove an adversarial case in the same change that
   changes a target implementation. Use a separately reviewed compatibility update.

Run `npm run validate` before declaring this repository structurally valid. Running an
implementation candidate requires its adapter and is reported separately from these
repository checks.
