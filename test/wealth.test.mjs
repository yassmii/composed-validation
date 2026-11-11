import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import {
  lockedContract, lockedContractSource, readJson, validateContractLock, validateSuite, validateProfile,
} from '../src/lib.mjs';
import { validateStructuredSuite, validateStructuredProfile } from '../src/structured-checks.mjs';

const id = 'wealth-advisory';
const version = '0.1.0';
const base = `suites/${id}/${version}`;
const source = lockedContractSource(id, version);
const manifest = readJson(`${base}/manifest.json`);
const profile = readJson(`profiles/${id}/${version}/profile.json`);
const fixture = readJson(`${base}/fixtures/synthetic-wealth.json`);

test('wealth draft uses immutable committed bytes, with 45 normative and 26 acceptance clauses', () => {
  const target = lockedContract(id, version);
  const result = validateContractLock(id, version);
  assert.deepEqual(result.errors, []);
  assert.equal(target.revision, '225959afc3836dc0fca86d8491e0c5f551071f6f');
  assert.equal(target.contentBlob, '63ee2c21a1d928fa79207448de6d165d41d62f9c');
  assert.equal(createHash('sha256').update(source).digest('hex'), target.contentSha256);
  assert.equal(result.clauses.filter((clause) => !clause.startsWith('ACC-')).length, 45);
  assert.equal(result.clauses.filter((clause) => clause.startsWith('ACC-')).length, 26);
  assert.deepEqual(validateSuite(id, version).errors, []);
  assert.deepEqual(validateProfile(id, version).errors, []);
  assert.equal(profile.contract.maturity, 'draft');
  assert.equal(profile.execution.runnerAvailable, false);
});

test('dropping a negative, boundary or recovery dimension is rejected despite complete clause mapping', () => {
  for (const kind of ['negative', 'boundary', 'recovery']) {
    const candidate = structuredClone(manifest);
    const group = candidate.cases.find((entry) => entry.checks.some((check) => check.kind === kind));
    group.checks = group.checks.filter((check) => check.kind !== kind);
    assert.ok(validateStructuredSuite(source, candidate).some((error) => /missing or extra.*combinations/.test(error)), kind);
  }
});

test('component assertions or candidate self-review cannot replace required proof boundaries', () => {
  const component = structuredClone(manifest);
  component.cases[0].checks[0].boundary = 'component';
  assert.ok(validateStructuredSuite(source, component).some((error) => /combinations/.test(error)));
  const manual = structuredClone(manifest);
  const group = manual.cases.find((entry) => entry.acceptanceId === 'ACC-WAD-014');
  group.checks[0].method = 'automated';
  group.review.mustBeExternalToCandidate = false;
  assert.ok(validateStructuredSuite(source, manual).some((error) => /human review/.test(error)));
  const selfApproved = structuredClone(manifest);
  selfApproved.cases.find((entry) => entry.acceptanceId === 'ACC-WAD-014').checks[0].requiresExternalReview = false;
  assert.ok(validateStructuredSuite(source, selfApproved).some((error) => /self-approval/.test(error)));
});

test('suite-only claims, optional skips and fabricated source passes are rejected', () => {
  for (const mutate of [
    (value) => { value.cases[0].claims.push('REQ-WAD-029'); },
    (value) => { value.cases[0].requiresCapability = 'automated-assistance'; },
    (value) => { value.cases[0].status = 'pass'; },
    (value) => { value.cases[0].checks[0].status = 'pass'; },
    (value) => { value.cases[0].checks.push(structuredClone(value.cases[0].checks[0])); },
    (value) => { value.cases[0].checks[0].assertions = []; },
    (value) => { value.cases.pop(); },
    (value) => { value.cases[1].acceptanceId = value.cases[0].acceptanceId; },
    (value) => { value.contractSha256 = '0'.repeat(64); },
  ]) {
    const candidate = structuredClone(manifest);
    mutate(candidate);
    assert.ok(validateStructuredSuite(source, candidate).length > 0);
  }
});

test('a profile cannot omit a manual group, duplicate a required group, promote maturity or drop blocked results', () => {
  for (const mutate of [
    (value) => { value.requiredCases = value.requiredCases.filter((entry) => entry !== 'WAD-ACC-014'); },
    (value) => { value.requiredCases.push(value.requiredCases[0]); },
    (value) => { value.contract.maturity = 'stable'; },
    (value) => { value.contract.sha256 = 'f'.repeat(64); },
    (value) => { value.execution.allowedVerdicts = ['pass', 'fail']; },
    (value) => { value.execution.plannedIsNotEvidence = false; },
    (value) => { delete value.execution.runnerAvailable; },
    (value) => { value.execution.runnerAvailable = true; },
  ]) {
    const candidate = structuredClone(profile);
    mutate(candidate);
    assert.ok(validateStructuredProfile(source, manifest, candidate).length > 0);
  }
});

test('structured proof requirements do not migrate older contract formats', () => {
  assert.deepEqual(validateStructuredSuite("schema_version: '0.1'\n", {}), []);
  assert.deepEqual(validateStructuredProfile("schema_version: '0.1'\n", {}, {}), []);
  assert.ok(validateStructuredSuite('broken: [', {}).length > 0);
});

test('ACC-WAD-005 and ACC-WAD-008 financial reference fixtures reconcile independently in integer cents', () => {
  const cents = (text) => BigInt(text.replace('.', ''));
  const { property, debt, envelope, expected } = fixture.inventory;
  const propertyCents = cents(property.grossEur);
  const debtCents = cents(debt.outstandingEur);
  assert.equal(propertyCents * 60n / 100n - debtCents * 60n / 100n, cents(expected.propertyNetPersonA));
  assert.equal(propertyCents * 40n / 100n - debtCents * 40n / 100n, cents(expected.propertyNetPersonB));
  assert.equal(envelope.components.reduce((sum, row) => sum + cents(row.grossEur), 0n), cents(envelope.grossEur));
  assert.equal(propertyCents + cents(envelope.grossEur) - debtCents, cents(expected.netGroup));
  assert.equal(cents(expected.netPersonA) + cents(expected.netPersonB), cents(expected.netGroup));
  const annual = (rows) => rows.reduce((sum, row) => sum + cents(row.amountEur) * (row.period === 'month' ? 12n : 1n), 0n);
  assert.equal(annual(fixture.budget.income), cents(fixture.budget.expected.incomeEur));
  assert.equal(annual(fixture.budget.income) - annual(fixture.budget.expenses), cents(fixture.budget.expected.balanceEur));
});

test('ACC-WAD-007 and ACC-WAD-010 references preserve adverse results and missing-model status', () => {
  const cents = (text) => BigInt(text.replace('.', ''));
  const position = fixture.inventory.foreignPosition;
  assert.equal(cents(position.amount) * 90n / 100n, cents(position.expectedEur));
  for (const [row, basisPoints] of fixture.projection.rates.map((row, index) => [row, [0n, 200n, -500n][index]])) {
    assert.equal(cents(fixture.projection.principalEur) * (10000n + basisPoints) / 10000n, cents(row.expectedEur));
  }
  assert.equal(fixture.inventory.uncoveredRights.valuationModel, null);
  assert.equal(fixture.executionStatus, 'not_run');
  assert.equal(fixture.reviews.syntheticReviewProvided, false);
});
