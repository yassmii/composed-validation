import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCareer } from '../src/run-career.mjs';
import { digest, evaluateAssertions, validateCareerCases } from '../src/career-checks.mjs';
import { lockedContract, lockedContractSource, readJson, suiteManifest, validateContractLock, validateProfile, validateSuite } from '../src/lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const id = 'career-evidence-platform';
const suite = (version, path) => resolve(root, `suites/${id}/${version}`, path);
const adapter = suite('1.0.1', 'fixtures/replay-adapter.mjs');
const manifest = suiteManifest(id, '1.0.1');
const added = readJson(`suites/${id}/1.0.1/fixtures/positive-observations.json`).observations;
// Same inputs, in the same order, as the control adapter's own revision.
const revision = [adapter, suite('1.0.1', 'manifest.json'), suite('1.0.1', 'fixtures/positive-observations.json'), suite('0.1.0', 'manifest.json'), suite('0.1.0', 'fixtures/positive-observations.json')]
  .reduce((hash, path) => hash.update(readFileSync(path)), createHash('sha256')).digest('hex');

function reviewBundle(directory) {
  mkdirSync(directory);
  const reportText = 'SYNTHETIC HARNESS CONTROL ONLY. No real participant, auditor, export reader or product was evaluated.\n';
  writeFileSync(resolve(directory, 'synthetic-review.txt'), reportText);
  const reviews = manifest.cases.filter((entry) => entry.review).map((entry) => ({
    caseId: entry.id, kind: entry.review.kind, reviewer: 'synthetic-test-reviewer', method: 'synthetic evidence plumbing control', performedAt: new Date().toISOString(), verdict: 'pass',
    artifacts: [{ path: 'synthetic-review.txt', sha256: digest(reportText) }],
    data: entry.review.kind === 'usability' ? { population: 'synthetic fixture rows only', participants: Array.from({ length: 10 }, (_, i) => ({ id: `synthetic-${i}`, firstTime: true, activeSeconds: 900, waitingSeconds: 30, helpCount: 0, errorCount: 1, hasRecommendationLetters: false, completedTasks: ['intake', 'inspect', 'correct', 'prepare-share'] })) } : undefined,
  }));
  const path = resolve(directory, 'bundle.json');
  writeFileSync(path, JSON.stringify({ format: 'career-review-bundle/v1', targetRevision: revision, contractRevision: lockedContract(id, '1.0.1').revision, reviews }));
  return path;
}

async function control(args = [], { reviews = true, contractVersion = '1.0.1', script = adapter } = {}) {
  const directory = mkdtempSync(resolve(tmpdir(), 'career-1-harness-'));
  try {
    const reviewsPath = reviews ? reviewBundle(resolve(directory, 'reviews')) : undefined;
    return await runCareer({ command: process.execPath, args: [script, ...args], output: resolve(directory, 'run'), reviewsPath, contractVersion });
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('career profile 1.0.0 pins contract 1.0.1 and maps 116 clauses to 30 cases', () => {
  assert.match(lockedContractSource(id, '1.0.1'), /validation_profile:\s*\n\s+id: career-evidence-platform\/conformance\s*\n\s+version: 1\.0\.0/);
  const lock = validateContractLock(id, '1.0.1');
  assert.deepEqual(lock.errors, []);
  assert.equal(lock.clauses.length, 116);
  assert.equal(digest(lockedContractSource(id, '1.0.1')), '51059aeef5b32f7e74ddd414ffac6e39e24eb5b474ea280e745dd80c95cafee4');
  assert.deepEqual(validateSuite(id, '1.0.1').errors, []);
  const profile = validateProfile(id, '1.0.1');
  assert.deepEqual(profile.errors, []);
  assert.equal(profile.requiredCaseCount, 30);
  assert.deepEqual(new Set(profile.profile.requiredCases), new Set(manifest.cases.map((entry) => entry.id)));
  assert.deepEqual(validateCareerCases(manifest), []);
});

test('career suite 1.0.1 keeps every 0.1.0 case unchanged and adds only the two strengthened clauses', () => {
  const previous = suiteManifest(id, '0.1.0');
  for (const entry of previous.cases) assert.deepEqual(manifest.cases.find((candidate) => candidate.id === entry.id), entry);
  const extra = manifest.cases.filter((entry) => !previous.cases.some((candidate) => candidate.id === entry.id));
  assert.deepEqual(extra.map((entry) => entry.id), ['CEP-ACC-023', 'CEP-ACC-024']);
  assert.deepEqual(extra.map((entry) => entry.claims), [['ACC-CEP-023', 'REQ-CEP-064', 'QA-CEP-007'], ['ACC-CEP-024', 'REQ-CEP-063', 'QA-CEP-007']]);
  // The earlier profile and its lock stay valid for implementations pinned to 0.1.0.
  assert.deepEqual(validateProfile(id, '0.1.0').errors, []);
  assert.equal(validateProfile(id, '0.1.0').requiredCaseCount, 28);
});

test('career suite 1.0.1 positive control passes the harness without certifying a product', async () => {
  const report = await control();
  assert.equal(report.verdict, 'pass');
  assert.deepEqual(report.summary, { pass: 30, fail: 0, blocked: 0, not_run: 0 });
  assert.equal(report.profile, 'career-evidence-platform/conformance@1.0.0');
  assert.equal(report.contract.version, '1.0.1');
  assert.equal(report.target.kind, 'harness-control');
  assert.equal(report.fullProfilePassed, false);
  assert.equal(report.corePassed, false);
  const inputs = report.harnessInputs.path;
  assert.equal(inputs, 'artifacts/harness-inputs.json');
});

test('career suite 1.0.1 without external reviews stays blocked', async () => {
  const report = await control([], { reviews: false });
  assert.equal(report.verdict, 'blocked');
  assert.deepEqual(report.summary, { pass: 24, fail: 0, blocked: 6, not_run: 0 });
});

test('the runner refuses an adapter that describes another contract version', async () => {
  const older = suite('0.1.0', 'fixtures/replay-adapter.mjs');
  const report = await control([], { reviews: false, script: older });
  assert.equal(report.verdict, 'blocked');
  assert.equal(report.cases.length, 0);
  await assert.rejects(() => control([], { reviews: false, contractVersion: '9.9.9' }), /No career-evidence-platform lock/);
});

test('ACC-CEP-023 / REQ-CEP-064 controls are rejected at their case', async (t) => {
  for (const mutation of ['aggregate-confirms', 'slice-dropped', 'slice-count-hidden', 'slice-relabelled', 'tuning-accepted', 'tuning-in-confirmation', 'declared-late']) {
    await t.test(mutation, async () => {
      const report = await control(['--mutation', mutation]);
      assert.equal(report.verdict, 'fail');
      assert.equal(report.cases.find((entry) => entry.id === 'CEP-ACC-023').verdict, 'fail');
      assert.equal(report.summary.fail, 1);
    });
  }
});

test('ACC-CEP-024 / REQ-CEP-063 controls are rejected at their case', async (t) => {
  for (const mutation of ['wrong-precision', 'zero-for-unknown', 'unknown-with-number', 'abstention-as-quality', 'merged-measures']) {
    await t.test(mutation, async () => {
      const report = await control(['--mutation', mutation]);
      assert.equal(report.verdict, 'fail');
      assert.equal(report.cases.find((entry) => entry.id === 'CEP-ACC-024').verdict, 'fail');
      assert.equal(report.summary.fail, 1);
    });
  }
});

test('evaluation-control assertions fail closed on missing or inconsistent observations', () => {
  const confirmation = manifest.cases.find((entry) => entry.id === 'CEP-ACC-023');
  const scorer = manifest.cases.find((entry) => entry.id === 'CEP-ACC-024');
  const passes = (testCase, observation) => evaluateAssertions(testCase.assertions, observation).every((check) => check.pass);
  assert.equal(passes(confirmation, added['CEP-ACC-023']), true);
  assert.equal(passes(scorer, added['CEP-ACC-024']), true);
  assert.equal(passes(confirmation, undefined), false);
  assert.equal(passes(scorer, {}), false);
  for (const field of Object.keys(added['CEP-ACC-023'])) {
    const missing = structuredClone(added['CEP-ACC-023']);
    delete missing[field];
    assert.equal(passes(confirmation, missing), false, `${field} cannot be omitted`);
  }
  for (const field of Object.keys(added['CEP-ACC-024'])) {
    const missing = structuredClone(added['CEP-ACC-024']);
    delete missing[field];
    assert.equal(passes(scorer, missing), false, `${field} cannot be omitted`);
  }
  // A slice marked as passing below its own minimum is inconsistent, whatever the verdict says.
  const inconsistent = structuredClone(added['CEP-ACC-023']);
  inconsistent.slices[0].candidate = 0.5;
  assert.equal(passes(confirmation, inconsistent), false);
  // An aggregate that does not improve is not the situation this case judges.
  const flat = structuredClone(added['CEP-ACC-023']);
  flat.aggregate.candidate = flat.aggregate.baseline;
  assert.equal(passes(confirmation, flat), false);
});
