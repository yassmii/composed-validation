import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contractPath, lockedContract, lockedContractSource, readJson, validateContractLock, validateProfile, validateSuite } from '../src/lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const suitePath = 'suites/prospecting-workspace/0.1.0';
const manifest = readJson(`${suitePath}/manifest.json`);
const matrix = readJson(`${suitePath}/conformance-matrix.json`);
const fixture = readJson(`${suitePath}/fixtures/synthetic-prospecting.json`);

test('prospecting contract is pinned to the supplied commit and covers every normative clause', () => {
  const target = lockedContract('prospecting-workspace', '0.1.0');
  const lock = validateContractLock('prospecting-workspace', '0.1.0');
  assert.deepEqual(lock.errors, []);
  assert.equal(lock.actualRevision, '30956f542581d5ca80ff5b9fcd7c850a7143f413');
  assert.equal(lock.actualBlob, target.contentBlob);
  assert.equal(lock.metadata.version, '0.1.0');
  assert.equal(lock.clauses.length, 118);
  assert.deepEqual(validateSuite('prospecting-workspace', '0.1.0').errors, []);
  assert.deepEqual(new Set(matrix.entries.map((entry) => entry.clause)), new Set(lock.clauses));
  assert.ok(matrix.entries.every((entry) => entry.status === 'planned'));
});

test('prospecting consumer profile requires all 32 acceptance scenarios and three separate quality cases', () => {
  const result = validateProfile('prospecting-workspace', '0.1.0');
  assert.deepEqual(result.errors, []);
  assert.equal(result.requiredCaseCount, 35);
  assert.deepEqual(new Set(result.profile.requiredCases), new Set(manifest.cases.map((entry) => entry.id)));
  const cases = new Map(manifest.cases.map((entry) => [entry.id, entry]));
  for (let n = 1; n <= 32; n++) {
    const suffix = String(n).padStart(3, '0');
    assert.ok(cases.get(`PR-ACC-${suffix}`)?.claims.includes(`ACC-PR-${suffix}`));
  }
  for (const entry of manifest.cases) {
    assert.equal(entry.status, 'planned');
    assert.equal(entry.fixture, fixture.id);
    for (const name of ['steps', 'assertions']) {
      assert.ok(entry[name].length >= 2);
      assert.ok(entry[name].every((text) => typeof text === 'string' && text.trim().length > 0));
    }
  }
  assert.equal(result.profile.execution.plannedIsNotEvidence, true);
  assert.equal(result.profile.execution.runnerAvailable, false);
});

test('POL-PR-002 keeps optional modules conditional without skipping mixed core safeguards', () => {
  const source = lockedContractSource('prospecting-workspace', '0.1.0');
  const conditionals = manifest.cases.filter((entry) => entry.requiresCapability);
  assert.deepEqual(conditionals.map((entry) => [entry.id, entry.requiresCapability]), [
    ['PR-ACC-019', 'CAP-PR-010'], ['PR-ACC-025', 'CAP-PR-013'], ['PR-ACC-032', 'CAP-PR-017'],
  ]);
  for (const entry of conditionals) {
    const capability = source.split(`  - id: ${entry.requiresCapability}\n`)[1]?.split('  - id: CAP-PR-')[0];
    assert.match(capability ?? '', /priority: should/);
  }
  for (const id of ['PR-ACC-008', 'PR-ACC-020', 'PR-ACC-021', 'PR-ACC-026']) {
    assert.equal(manifest.cases.find((entry) => entry.id === id).requiresCapability, undefined);
  }
  assert.equal(manifest.cases.find((entry) => entry.id === 'PR-ACC-018').requiresChannel, 'email');
});

test('REQ-PR-001 / ACC-PR-001 profile templates reproduce their locked source bytes', () => {
  const target = lockedContract('prospecting-workspace', '0.1.0');
  const sourceRepository = resolve(dirname(contractPath('prospecting-workspace', '0.1.0')), '../../../../');
  assert.deepEqual(fixture.profileTemplates.map((entry) => entry.id), ['commerces-locaux', 'coproprietes-fr', 'projets-numeriques']);
  for (const entry of fixture.profileTemplates) {
    assert.equal(entry.revision, target.revision);
    const bytes = readFileSync(resolve(root, suitePath, 'fixtures', entry.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    const original = execFileSync('git', ['-C', sourceRepository, 'show', `${target.revision}:${entry.sourcePath}`]);
    assert.deepEqual(bytes, original);
    assert.equal(execFileSync('git', ['-C', sourceRepository, 'rev-parse', `${target.revision}:${entry.sourcePath}`], { encoding: 'utf8' }).trim(), entry.contentBlob);
    assert.match(bytes.toString('utf8'), /activation_ready: false/);
  }
  const project = fixture.entities.find((entry) => entry.id === 'project-a');
  for (const key of ['address', 'city', 'email', 'company', 'adresse', 'commune', 'courriel']) {
    assert.equal(Object.hasOwn(project, key) || Object.hasOwn(project.attributes, key), false);
  }
});

test('QA-PR-001 / QA-PR-002 / QA-PR-008 retain the locked quality thresholds and real evidence gates', () => {
  const source = lockedContractSource('prospecting-workspace', '0.1.0');
  assert.match(source, /100 000 dossiers par espace et 50 utilisateurs simultanés/);
  assert.match(source, /au moins cinq utilisateurs[^\n]+au moins quatre réalisent sans aide/);
  const load = manifest.cases.find((entry) => entry.id === 'PR-QA-002');
  assert.deepEqual(load.criteria, {
    dossiersPerWorkspace: 100000, simultaneousUsers: 50, ordinaryOperationClasses: ['read', 'filter', 'save'],
    p95MaxMs: 2000, longOperationAcknowledgementMaxMs: 2000, requiresActualLoadGeneration: true,
  });
  const usability = manifest.cases.find((entry) => entry.id === 'PR-QA-008');
  assert.deepEqual(usability.criteria, {
    minimumRepresentativeUsers: 5, minimumSuccessfulUsers: 4, tasks: ['select', 'examine-qualification', 'plan-next-action'],
    withoutHelp: true, requiresActualParticipants: true,
  });
  assert.deepEqual(manifest.cases.find((entry) => entry.id === 'PR-QA-001').criteria, {
    standard: 'WCAG 2.2 AA', reflowCssPixels: 320, zoomPercent: 200, manualAndAutomated: true,
  });
  for (const suffix of ['001', '002', '008']) {
    assert.equal(matrix.entries.find((entry) => entry.clause === `QA-PR-${suffix}`).proof, `PR-QA-${suffix}`);
    assert.ok(manifest.cases.find((entry) => entry.id === `PR-QA-${suffix}`).evidenceRequired.length > 0);
  }
});
