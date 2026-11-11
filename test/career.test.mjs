import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runCareer } from '../src/run-career.mjs';
import { digest, evaluateAssertions, evaluateReview, loadReviews, validateCareerCases } from '../src/career-checks.mjs';
import { lockedContract, lockedContractSource, readJson, validateContractLock, validateProfile } from '../src/lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = resolve(root, 'suites/career-evidence-platform/0.1.0/fixtures');
const adapter = resolve(fixtureRoot, 'replay-adapter.mjs');
const manifest = readJson('suites/career-evidence-platform/0.1.0/manifest.json');
const revision = createHash('sha256').update(readFileSync(adapter)).update(readFileSync(resolve(fixtureRoot, '../manifest.json'))).update(readFileSync(resolve(fixtureRoot, 'positive-observations.json'))).digest('hex');

function reviewBundle(directory) {
  mkdirSync(directory);
  const reportText = 'SYNTHETIC HARNESS CONTROL ONLY. No real participant, auditor, export reader or product was evaluated.\n';
  writeFileSync(resolve(directory, 'synthetic-review.txt'), reportText);
  const reviews = manifest.cases.filter((entry) => entry.review).map((entry) => ({
    caseId: entry.id, kind: entry.review.kind, reviewer: 'synthetic-test-reviewer', method: 'synthetic evidence plumbing control', performedAt: new Date().toISOString(), verdict: 'pass',
    artifacts: [{ path: 'synthetic-review.txt', sha256: digest(reportText) }],
    data: entry.review.kind === 'usability' ? { population: 'synthetic fixture rows only', participants: Array.from({ length: 10 }, (_, i) => ({ id: `synthetic-${i}`, firstTime: true, activeSeconds: i < 8 ? 900 : 1200, waitingSeconds: 30, helpCount: 0, errorCount: 1, hasRecommendationLetters: false, completedTasks: ['intake', 'inspect', 'correct', 'prepare-share'] })) } : undefined,
  }));
  const bundle = { format: 'career-review-bundle/v1', targetRevision: revision, contractRevision: lockedContract('career-evidence-platform', '0.1.0').revision, reviews };
  const path = resolve(directory, 'bundle.json');
  writeFileSync(path, JSON.stringify(bundle));
  return { path, bundle };
}

async function control(args = [], { reviews = true, timeoutMs } = {}) {
  const directory = mkdtempSync(resolve(tmpdir(), 'career-harness-'));
  try {
    const bundle = reviews ? reviewBundle(resolve(directory, 'reviews')) : undefined;
    const output = resolve(directory, 'run');
    const report = await runCareer({ command: process.execPath, args: [adapter, ...args], output, reviewsPath: bundle?.path, timeoutMs });
    const persisted = JSON.parse(readFileSync(resolve(output, 'report.json')));
    assert.deepEqual(persisted, report);
    assert.equal(readFileSync(resolve(output, 'report.sha256'), 'utf8').split(' ')[0], digest(readFileSync(resolve(output, 'report.json'))));
    for (const artifact of report.artifacts) assert.equal(digest(readFileSync(resolve(output, artifact.path))), artifact.sha256);
    return { report, serialized: JSON.stringify(report) + report.artifacts.filter((artifact) => artifact.path.endsWith('.json')).map((artifact) => readFileSync(resolve(output, artifact.path), 'utf8')).join('') };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('career profile pins the committed contract and maps 114 clauses to 28 executable cases', () => {
  const lock = validateContractLock('career-evidence-platform', '0.1.0');
  assert.deepEqual(lock.errors, []);
  assert.equal(lock.clauses.length, 114);
  const profile = validateProfile('career-evidence-platform', '0.1.0');
  assert.deepEqual(profile.errors, []);
  assert.equal(profile.requiredCaseCount, 28);
  assert.deepEqual(new Set(profile.profile.requiredCases), new Set(manifest.cases.map((entry) => entry.id)));
  assert.match(lockedContractSource('career-evidence-platform', '0.1.0'), /validation_profile:\s*\n\s+id: career-evidence-platform\/conformance\s*\n\s+version: 0\.1\.0/);
  assert.deepEqual(validateCareerCases(manifest), []);
});

test('missing external human evidence stays blocked instead of passing a replay', async () => {
  const { report } = await control([], { reviews: false });
  assert.equal(report.verdict, 'blocked');
  assert.deepEqual(report.summary, { pass: 22, fail: 0, blocked: 6, not_run: 0 });
  assert.equal(report.fullProfilePassed, false);
  assert.equal(report.corePassed, false);
  assert.ok(report.cases.every((entry) => entry.cleanup === 'confirmed'));
});

test('positive replay and synthetic review controls pass the harness without certifying a product', async () => {
  const { report } = await control();
  assert.equal(report.verdict, 'pass');
  assert.deepEqual(report.summary, { pass: 28, fail: 0, blocked: 0, not_run: 0 });
  assert.equal(report.target.kind, 'harness-control');
  assert.equal(report.fullProfilePassed, false);
  assert.equal(report.corePassed, false);
  assert.ok(report.artifacts.length > 28);
});

test('REQ-CEP-035 / QA-CEP-006 accepts richer exports only with full reconciliation', async () => {
  const { report } = await control(['--mutation', 'export-rich']);
  assert.deepEqual(report.summary, { pass: 28, fail: 0, blocked: 0, not_run: 0 });
  const exportCase = manifest.cases.find((entry) => entry.id === 'CEP-QA-006');
  assert.equal(exportCase.review.kind, 'export-reader');
  assert.equal(exportCase.review.required, true);
  const positive = readJson('suites/career-evidence-platform/0.1.0/fixtures/positive-observations.json').observations[exportCase.id];
  for (const [category, minimum] of Object.entries({ Entities: 4, TypedLinks: 3, Versions: 2, Markers: 3 })) {
    for (const prefix of ['expected', 'read']) {
      const observation = { ...positive, [`${prefix}${category}`]: minimum - 1 };
      assert.ok(evaluateAssertions(exportCase.assertions, observation).some((check) => !check.pass), `${prefix}${category} below minimum must fail`);
    }
    const path = `unreconciled${category}`;
    assert.ok(evaluateAssertions(exportCase.assertions, { ...positive, [path]: 1 }).some((check) => !check.pass), `${path} must fail`);
    const missing = { ...positive };
    delete missing[path];
    assert.ok(evaluateAssertions(exportCase.assertions, missing).some((check) => !check.pass), `${path} cannot be omitted`);
  }
});

test('ACC-CEP-004 / REQ-CEP-012 previews a splittable merged event and checks cancellation before undo', () => {
  const splitCase = manifest.cases.find((entry) => entry.id === 'CEP-ACC-004');
  assert.deepEqual(splitCase.steps.map((step) => step.name), [
    'intake-events', 'preview-merge', 'confirm-merge', 'preview-split', 'cancel-split', 'undo-merge', 'CEP-ACC-004',
  ]);
  const positive = readJson('suites/career-evidence-platform/0.1.0/fixtures/positive-observations.json').observations[splitCase.id];
  for (const path of ['splitPreviewSourceIds', 'recordUnchangedAfterCancelSplit']) {
    const missing = { ...positive };
    delete missing[path];
    assert.ok(evaluateAssertions(splitCase.assertions, missing).some((check) => !check.pass), `${path} cannot be omitted`);
  }
});

test('adversarial mutations are rejected at their contract cases', async (t) => {
  const mutations = {
    leak: 'CEP-ACC-013', certification: 'CEP-ACC-005', charges: 'CEP-ACC-015', consent: 'CEP-ACC-016',
    mapping: 'CEP-ACC-007', restore: 'CEP-ACC-014', 'false-completion': 'CEP-ACC-002',
    evaluation: 'CEP-ACC-021', 'blanket-sota': 'CEP-ACC-021',
    'export-unreconciled': 'CEP-QA-006', 'export-below-minimum': 'CEP-QA-006',
    'split-sources': 'CEP-ACC-004', 'split-cancel-changed': 'CEP-ACC-004',
  };
  for (const [mutation, id] of Object.entries(mutations)) {
    await t.test(mutation, async () => {
      const { report } = await control(['--mutation', mutation]);
      assert.equal(report.verdict, 'fail');
      assert.equal(report.cases.find((entry) => entry.id === id).verdict, 'fail');
      assert.equal(report.fullProfilePassed, false);
    });
  }
});

test('unsupported optional modules remain not_run and cannot produce a complete profile claim', async () => {
  const { report } = await control(['--no-optionals']);
  assert.deepEqual(report.summary, { pass: 23, fail: 0, blocked: 0, not_run: 5 });
  assert.equal(report.verdict, 'not_run');
  assert.equal(report.fullProfilePassed, false);
});

test('unreproducible fault injection blocks the affected cases', async () => {
  const { report } = await control(['--mutation', 'unsupported-fault']);
  for (const id of ['CEP-ACC-014', 'CEP-ACC-015', 'CEP-ACC-018']) assert.equal(report.cases.find((entry) => entry.id === id).verdict, 'blocked');
  assert.equal(report.summary.fail, 0);
});

test('target revision drift and unconfirmed cleanup fail execution evidence', async () => {
  const drift = (await control(['--mutation', 'revision-drift'])).report;
  assert.equal(drift.verdict, 'fail');
  assert.match(drift.cases[0].reason, /revision changed/);
  const cleanup = (await control(['--mutation', 'cleanup'])).report;
  assert.equal(cleanup.summary.fail, 28);
  assert.ok(cleanup.cases.every((entry) => entry.cleanup === 'unconfirmed'));
});

test('malformed envelopes, timeouts and secret diagnostics never produce a success record', async () => {
  for (const mutation of ['bad-envelope', 'timeout', 'secret-field']) {
    const { report, serialized } = await control(['--mutation', mutation], { reviews: false, timeoutMs: 200 });
    assert.equal(report.verdict, 'blocked');
    assert.equal(report.fullProfilePassed, false);
    assert.ok(!serialized.includes('UNREDACTED-CONTROL-SECRET'));
  }
  const { report, serialized } = await control(['--mutation', 'stderr-secret']);
  assert.equal(report.verdict, 'pass');
  assert.ok(!serialized.includes('UNREDACTED-STDERR-CONTROL-SECRET'));
});

test('unknown assertions and omitted observation fields fail closed', () => {
  const altered = structuredClone(manifest);
  altered.cases[0].assertions[0].operator = 'pretend_pass';
  assert.ok(validateCareerCases(altered).length > 0);
  assert.throws(() => evaluateAssertions(altered.cases[0].assertions, {}), /Unknown assertion/);
  assert.equal(evaluateAssertions([{ path: 'absent', operator: 'equal', expected: null }], {})[0].pass, false);
  assert.equal(evaluateAssertions([{ path: 'absent', operator: 'not_contains', expected: 'canary' }], {})[0].pass, false);
});

test('latency uses p95 of the declared workload and cannot pass on one fast sample', () => {
  const assertion = [{ path: '$timings', operator: 'p95_lte', expected: 2000 }];
  assert.equal(evaluateAssertions(assertion, {}, [1])[0].pass, false);
  assert.equal(evaluateAssertions(assertion, {}, [...Array(19).fill(100), 3000])[0].pass, true);
  assert.equal(evaluateAssertions(assertion, {}, [...Array(18).fill(100), 3000, 3000])[0].pass, false);
});

test('review provenance, artifact hashes and the actual usability threshold are enforced', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'career-reviews-'));
  try {
    const { path, bundle } = reviewBundle(resolve(directory, 'evidence'));
    const testCase = manifest.cases.find((entry) => entry.id === 'CEP-QA-001');
    let reviews = loadReviews(path, revision, lockedContract('career-evidence-platform', '0.1.0').revision);
    assert.equal(evaluateReview(testCase, reviews).verdict, 'pass');
    reviews.get(testCase.id).data.participants[7].activeSeconds = 901;
    assert.equal(evaluateReview(testCase, reviews).verdict, 'fail');
    reviews.get(testCase.id).data.participants[7].activeSeconds = 900;
    reviews.get(testCase.id).data.participants[7].helpCount = 1;
    assert.equal(evaluateReview(testCase, reviews).verdict, 'fail');
    reviews.get(testCase.id).artifacts[0].sha256 = '0'.repeat(64);
    assert.equal(evaluateReview(testCase, reviews).verdict, 'blocked');
    assert.throws(() => loadReviews(path, '1'.repeat(40), bundle.contractRevision), /identity/);
    assert.throws(() => loadReviews(path, revision, '1'.repeat(40)), /identity/);
    bundle.reviews.push(bundle.reviews[0]);
    writeFileSync(path, JSON.stringify(bundle));
    assert.throws(() => loadReviews(path, revision, bundle.contractRevision), /duplicate/);
    const escaped = { ...bundle, reviews: [{ ...bundle.reviews[0], caseId: testCase.id, kind: 'usability', artifacts: [{ path: '../outside.txt', sha256: digest('outside') }] }] };
    writeFileSync(resolve(directory, 'outside.txt'), 'outside');
    writeFileSync(path, JSON.stringify(escaped));
    reviews = loadReviews(path, revision, bundle.contractRevision);
    assert.equal(evaluateReview(testCase, reviews).verdict, 'blocked');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('CLI runs an adapter and returns nonzero when required human evidence is absent', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'career-cli-'));
  try {
    assert.throws(() => execFileSync(process.execPath, [resolve(root, 'src/run-career.mjs'), '--adapter', process.execPath, '--output', resolve(directory, 'run'), '--', adapter], { stdio: ['ignore', 'pipe', 'pipe'] }), (error) => {
      assert.equal(error.status, 1);
      assert.equal(JSON.parse(error.stdout.toString()).verdict, 'blocked');
      return true;
    });
    const report = JSON.parse(readFileSync(resolve(directory, 'run/report.json')));
    assert.equal(report.summary.pass, 22);
    assert.equal(report.summary.blocked, 6);
    assert.throws(() => mkdirSync(resolve(directory, 'run')), /EEXIST/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
