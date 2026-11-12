# Composed Validation

External evidence for implementations of version-pinned [Composed](https://github.com/yassmii/composed)
product contracts. Composed owns the product rules, the candidate owns its code, and this repository
owns validation assets and results. Targets are pinned in [contracts.lock.json](contracts.lock.json).

## Start with the result you need

Working with an agent in your project? Ask:

> Check this implementation against its pinned validation profile. Find the existing adapter and
> evidence, run the available checks, and tell me what passed, what is missing and the next action.

The agent recovers the contract/profile pin, candidate revision, adapter and required reviews from
existing project sources. It asks only for missing material inputs. A profile with no runner cannot
execute a candidate; a green validator self-test does not fill that gap.

| Need | Start here |
| --- | --- |
| Check this validation repository | [Local verification](#local-verification): inspect locks, suite mappings, profiles and validator tests. |
| Test an implementation | Find its suite in [availability](#available-suites), then use its runner and public-interface adapter. |
| Understand a completed run | Read the [result and next action](docs/evidence-model.md#read-a-career-run) in its report. |

## Local verification

Use Node >=20 and npm from the same OS. Install dependencies once with `npm ci`, then:

```bash
npm run validate
```

This checks the repository and its validators. It does **not** run your product. The default source
is the sibling checkout `../composed`, which must contain every locked Git revision. The current
working-tree contract may be newer; validation reads the locked objects. See
[contract source locations](#contract-source-locations) if you use another checkout.

## Available suites

| Contract suite | Candidate execution here | Next step |
| --- | --- | --- |
| Agent OS 0.1.0 / 0.2.0 | Planned cases; no runner supplied. | Review the [0.2.0 profile](profiles/agent-os/0.2.0/profile.json) and prepare runner/adapter. |
| Collaborative Workspace 0.1.0 | Planned cases; no runner supplied. | Review the [profile](profiles/collaborative-workspace/0.1.0/profile.json) and prepare runner/adapter. |
| Video Editorial Workflow 0.3.1 | Planned cases; no runner supplied. | Use the [suite and fixtures](suites/video-editorial-workflow/0.3.1/README.md) to prepare execution. |
| Career Evidence Platform 0.1.0 | Runner available; requires a candidate adapter and six external reviews for a complete run. | [Run a candidate](#run-a-career-candidate). |
| Career Evidence Platform 1.0.1 candidate | Runner available with `--contract-version 1.0.1`; profile 1.0.0 extends 0.1.0 with two evaluation-control cases (30 cases). | Read the [1.0.1 suite guide](suites/career-evidence-platform/1.0.1/README.md). |
| Prospecting Workspace 0.1.0 | Planned cases; no runner supplied. | Use the [suite](suites/prospecting-workspace/0.1.0/README.md) to prepare execution. |
| Wealth Advisory 0.1.0 draft | 26 planned groups / 54 proof dimensions; no runner or adapter supplied. | Use the [suite](suites/wealth-advisory/0.1.0/README.md) to prepare execution and required professional/human evidence. |

These assets do not establish that a product has passed. Profile versions and contract versions are
independent; keep the project's existing pin rather than automatically adopting the newest contract.

## Run a career candidate

The adapter must use the candidate's public interfaces with disposable fixture-scoped resources.
From this repository, after checking the locked suite, provide the actual adapter and a **new** output
directory whose parent exists:

```bash
npm run validate:career -- --adapter /absolute/path/to/adapter-executable --output reports/run-001
```

Create `reports/` first if absent. For a Node adapter, set `--adapter` to the Node executable and
append `-- /absolute/path/to/adapter.mjs`. Include `--reviews /absolute/path/to/bundle.json` before
that separator when real external review evidence is available. Missing required reviews remain
blocked. The [suite guide](suites/career-evidence-platform/0.1.0/README.md) and
[adapter protocol](suites/career-evidence-platform/0.1.0/adapter.md) define the required operations.

The runner judges contract 0.1.0 unless `--contract-version 1.0.1` is given; results for one version
are not results for the other.

The command prints the report path, verdict, counts and `fullProfilePassed`. Start with its
[interpretation](docs/evidence-model.md#read-a-career-run), then inspect the affected case reasons.
A synthetic replay is a validator control; it never produces a candidate-conformance claim.

## Contract source locations

For another Composed checkout, set the relevant variable to its contract file path. Its Git object
database must contain the locked revision; fetch the required commits before validating a fresh clone.

| Contract | Environment variable |
| --- | --- |
| Agent OS | `COMPOSED_CONTRACT_PATH` |
| Collaborative Workspace | `COMPOSED_COLLABORATIVE_WORKSPACE_CONTRACT_PATH` |
| Video Editorial Workflow | `COMPOSED_VIDEO_EDITORIAL_WORKFLOW_CONTRACT_PATH` |
| Career Evidence Platform | `COMPOSED_CAREER_EVIDENCE_PLATFORM_CONTRACT_PATH` |
| Prospecting Workspace | `COMPOSED_PROSPECTING_WORKSPACE_CONTRACT_PATH` |
| Wealth Advisory | `COMPOSED_WEALTH_ADVISORY_CONTRACT_PATH` |

Suites and their matrices live in `suites/`, profiles in `profiles/`, validators in `src/`, and
validator tests in `test/`. Generated evidence belongs in ignored `reports/`. For new runners, read
[the adapter protocol](docs/adapter-protocol.md) and [evidence model](docs/evidence-model.md).
