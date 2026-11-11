# Candidate adapter protocol

Suites are product-agnostic and must test a candidate through its public boundary. An
implementation supplies an adapter; it may be a CLI process, an HTTP service, or a
container entrypoint, but it exposes the same validation operations.

## Required operations

- `describe` returns implementation name, immutable version or revision, supported
  contract IDs and versions, supported suites, and isolation mode.
- `reset` provisions a clean, disposable test tenant and returns its opaque identifier.
- `execute` submits one named fixture action to that tenant and returns a structured
  result, including any process or request identifiers.
- `inspect` returns a read-only observation requested by the suite: state, events,
  usage, files exposed by a fixture, or an explicitly masked value.
- `inject` applies a named test fault only in a declared test mode (for example runtime
  termination, delayed model response, or unavailable sandbox provider).
- `dispose` destroys the tenant and reports resource cleanup.

The adapter is a validation-layer protocol, not an addition to a Composed product
contract. It may only translate existing public product operations; it must not add a
privileged bypass into the candidate.

## Result shape

Every operation result includes `ok`, `operationId`, `targetRevision`, `startedAt`,
`finishedAt`, `result`, and `diagnostics`. Secret-like fields are redacted by the adapter
before returning. A suite treats an unredacted secret as a failure, not as useful debug
output.

## Isolation of the test harness

The adapter receives only fixture-scoped credentials and disposable storage. It must
never reuse an operator credential, a production endpoint, or a tenant outside the
fixture. A target that cannot provide this boundary is ineligible for adversarial or
fault-injection suites.

## Executable profiles

The career profile implements this boundary through a bounded JSONL stdio runner.
Its [operation and review protocol](../suites/career-evidence-platform/0.1.0/adapter.md)
specifies fixture observations without constraining the product's own transport,
language or storage. Replay adapters are synthetic harness controls and cannot
claim product conformance.
