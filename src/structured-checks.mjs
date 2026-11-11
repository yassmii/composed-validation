import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { parse } from 'yaml';

const digest = (source) => createHash('sha256').update(source).digest('hex');
const strings = (value) => Array.isArray(value) && value.length > 0
  && value.every((item) => typeof item === 'string' && item.trim().length > 0);
const sorted = (value) => Array.isArray(value) ? [...value].sort() : [];

/** Format-0.2 proof coverage, never an execution or a product-conformance verdict. */
export function validateStructuredSuite(source, manifest) {
  const errors = [];
  let contract;
  try {
    contract = parse(source, { uniqueKeys: true });
  } catch {
    return ['Locked structured contract is not valid YAML.'];
  }
  if (contract?.schema_version !== '0.2') return errors;
  if (manifest.contractSchemaVersion !== '0.2') errors.push('Structured suite must declare contract schema version 0.2.');
  if (manifest.contractSha256 !== digest(source)) errors.push('Structured suite contract SHA-256 differs from the locked bytes.');
  if (manifest.proofClaimsRequired !== true) errors.push('Structured suite must require matrix proofs to claim their clauses.');

  const clauses = [
    ...(contract.capabilities ?? []).flatMap((entry) => entry.requirements ?? []),
    ...(contract.invariants ?? []), ...(contract.policies ?? []), ...(contract.quality_attributes ?? []),
  ];
  const normative = new Set(clauses.map((entry) => entry.id));
  const covered = new Set();
  const cases = new Map();
  for (const entry of manifest.cases ?? []) {
    if (cases.has(entry.acceptanceId)) errors.push(`Duplicate acceptance mapping ${entry.acceptanceId}.`);
    cases.set(entry.acceptanceId, entry);
  }
  const acceptanceIds = new Set((contract.acceptance ?? []).map((entry) => entry.id));
  for (const id of cases.keys()) if (!acceptanceIds.has(id)) errors.push(`Unknown acceptance mapping ${id}.`);

  for (const acceptance of contract.acceptance ?? []) {
    const entry = cases.get(acceptance.id);
    if (!entry) {
      errors.push(`Missing structured acceptance ${acceptance.id}.`);
      continue;
    }
    if (entry.status !== 'planned') errors.push(`${entry.id} must remain planned in the source manifest.`);
    if (entry.requiresCapability || entry.requiresChannel) errors.push(`${entry.id} cannot skip required structured proof using a suite-only condition.`);
    const expectedClaims = sorted([acceptance.id, ...acceptance.verifies]);
    if (!isDeepStrictEqual(sorted(entry.claims), expectedClaims)) errors.push(`${entry.id} claims differ from the contract acceptance verifies links.`);
    for (const id of acceptance.verifies) {
      if (!normative.has(id)) errors.push(`${acceptance.id} names unknown normative clause ${id}.`);
      covered.add(id);
    }
    const required = acceptance.verification;
    if (!isDeepStrictEqual(entry.verification, required)) errors.push(`${entry.id} changes the contract verification boundary, methods or kinds.`);
    const dimensions = new Set();
    const checkIds = new Set();
    for (const check of entry.checks ?? []) {
      const key = JSON.stringify([check.method, check.boundary, check.kind]);
      if (dimensions.has(key)) errors.push(`${entry.id} duplicates a proof dimension.`);
      if (!check.id || checkIds.has(check.id)) errors.push(`${entry.id} duplicates or omits a check ID.`);
      dimensions.add(key);
      checkIds.add(check.id);
      if (check.status !== 'planned') errors.push(`${check.id} must remain planned until an actual run.`);
      if (!strings(check.steps) || !strings(check.assertions) || typeof check.evidence !== 'string' || !check.evidence.trim()) errors.push(`${check.id} needs observable steps, assertions and evidence.`);
      if (check.method === 'manual' && check.requiresExternalReview !== true) errors.push(`${check.id} cannot replace the required manual review with candidate self-approval.`);
    }
    const expectedDimensions = new Set(required.methods.flatMap((method) => required.case_kinds.map((kind) => JSON.stringify([method, required.boundary, kind]))));
    if (!isDeepStrictEqual(sorted([...dimensions]), sorted([...expectedDimensions]))) errors.push(`${entry.id} has missing or extra method/boundary/kind combinations.`);
    if (required.boundary === 'human-review' && (entry.review?.required !== true || entry.review.mustBeExternalToCandidate !== true || entry.review.targetAndContractBound !== true || entry.review.authorAndReviewerDistinct !== true)) errors.push(`${entry.id} must require an external, target-bound, attributed human review.`);
  }
  for (const id of normative) if (!covered.has(id)) errors.push(`No structured acceptance covers ${id}.`);
  return errors;
}

/** Required groups cannot be dropped to turn incomplete format-0.2 proof green. */
export function validateStructuredProfile(source, manifest, profile) {
  let contract;
  try { contract = parse(source, { uniqueKeys: true }); }
  catch { return ['Locked structured profile contract is not valid YAML.']; }
  if (contract?.schema_version !== '0.2') return [];
  const errors = [];
  if (profile.contract?.schemaVersion !== '0.2' || profile.contract?.sha256 !== digest(source)) errors.push('Structured profile must identify schema 0.2 and the exact contract SHA-256.');
  if (profile.contract?.maturity !== contract.status) errors.push('Structured profile must preserve locked contract maturity.');
  if (!isDeepStrictEqual(sorted(profile.requiredCases), sorted(manifest.cases.map((entry) => entry.id)))) errors.push('Structured profile must require every acceptance group exactly once.');
  if (profile.execution?.plannedIsNotEvidence !== true || profile.execution?.targetRevisionRequired !== true || profile.execution?.reportRequired !== true) errors.push('Structured profile must require target-bound execution evidence, not planned rows.');
  if (!isDeepStrictEqual(profile.execution?.allowedVerdicts, ['pass', 'fail', 'blocked', 'not_run'])) errors.push('Structured profile must preserve failed, blocked and unexecuted verdicts.');
  if (typeof profile.execution?.runnerAvailable !== 'boolean') errors.push('Structured profile must disclose runner availability.');
  if (profile.execution?.runnerAvailable === true && (!manifest.runner || !manifest.executableFormat)) errors.push('Structured profile cannot advertise a runner without a named executable manifest.');
  return errors;
}
