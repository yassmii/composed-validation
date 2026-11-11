# Video Editorial Workflow — contract 0.3.1

This suite implements the external profile
`video-editorial-workflow/conformance@0.1.0`. Profile and contract versions are
independent. The lock pins the contract by its actual Composed commit and
content blob; the sibling checkout must contain this immutable revision.

The matrix maps all 34 normative clauses (requirements, invariants, policies,
quality attributes and acceptance scenarios) to 12 planned cases. Case claims,
steps, assertions, applicability and fixture identities are in `manifest.json`.
Every matrix proof must explicitly claim its clause.

## Candidate boundary

Supply an adapter implementing `describe`, `reset`, `execute`, `inspect`,
`inject` and `dispose` from `docs/adapter-protocol.md`. Map the named scenario
actions to the candidate's documented public operations. The suite does not
choose HTTP routes, storage engines, identity vendors, codecs or model APIs.

Each attempt uses a disposable project and fixture-scoped actors and storage.
Fault injection may control a declared test dependency, revoke a fixture source,
or cancel a run through public operations. It must not manufacture a candidate
state by writing its private storage. If a fault cannot be reproduced at this
boundary, report `blocked` with the limit instead of claiming success.

## Reference data

`fixtures/reference-interview.json` specifies two source assets, supplied
synthetic transcripts, an ordered selection, one contextual note, an egress
canary and fault names. The fixture order intentionally selects asset-b before
asset-a so that accidental source sorting is observable. Selection boundaries
are meaningful and must be preserved.

Generate disposable media with:

```sh
node suites/video-editorial-workflow/0.3.1/fixtures/generate-media.mjs /path/to/disposable-fixture
```

The generator creates two eight-second PCM WAV files and `sources.json` with
byte lengths and SHA-256 digests. They require no download, secret, vendor or
codec tool. The text is supplied editorial matter; tones do not test ASR,
lip-sync, camera switching, subtitle quality or video decoding. Candidates with
video-only ingestion need an additional generated playable fixture with a
documented generator/version and hashes. Until then those checks are blocked;
audio fixtures are not evidence of video-format compatibility.

The candidate may produce any declared supported handoff format. Compare the
result through its manifest and a suitable reader for that format. A parseable
file alone does not establish recipient compatibility. Record the actual
recipient environment and recipe when performed; otherwise keep it unverified.

## Evidence and optional capabilities

Execute scenarios against one immutable candidate revision and retain commands,
environment, actor attribution, normalised public observations and artifact
hashes. Do not compare random IDs, timestamps, file encodings or storage paths
between profiles; compare their domain meaning and provenance relations.

Cross-profile, local-portability and contextual-review cases are conditional
on the offered capabilities. Unsupported cases produce `not_run`, never `pass`.
A core-only report can state its exact coverage, but cannot claim full-profile
conformance with required cases unexecuted. No timing or quality threshold is
invented beyond the contract.

`npm run validate` checks these assets and the harness itself. It does not run
a candidate. There is no candidate runner/adapter in this scaffold yet; all
case records remain `planned` and provide no application-conformance evidence.
