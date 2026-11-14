import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { generateMedia } from '../suites/video-editorial-workflow/0.3.1/fixtures/generate-media.mjs';

import {
  validateAgentOsProfile,
  validateAllSuites,
  validateCollaborativeWorkspaceProfile,
  validateContractLock,
  validateProfile,
  lockedContract,
  lockedContractSource,
  readJson,
  contractClauses,
  contractMetadata,
} from '../src/lib.mjs';

test('the current Agent OS contract is pinned by revision and content', () => {
  const result = validateContractLock();
  assert.deepEqual(result.errors, []);
  assert.equal(result.metadata.version, '1.0.0');
  assert.equal(result.clauses.length, 71);
});

test('the Agent OS 0.2.0 baseline stays pinned beside the 1.0.0 candidate', () => {
  const result = validateContractLock('agent-os', '0.2.0');
  assert.deepEqual(result.errors, []);
  assert.equal(result.clauses.length, 69);
});

test('the Agent OS 1.0.0 profile adds the execution-time authority cases', () => {
  const result = validateProfile('agent-os', '1.0.0');
  assert.deepEqual(result.errors, []);
  assert.equal(result.requiredCaseCount, 27);
  const baseline = new Set(validateAgentOsProfile().profile.requiredCases);
  assert.deepEqual(result.profile.requiredCases.filter((id) => !baseline.has(id)), ['AOS-ACC-019', 'AOS-ACC-020']);
  assert.deepEqual([...baseline].filter((id) => !result.profile.requiredCases.includes(id)), []);

  const matrix = readJson('suites/agent-os/1.0.0/conformance-matrix.json');
  assert.deepEqual(matrix.overrides.map((entry) => [entry.clause, entry.proof]), [
    ['REQ-AOS-012', 'AOS-ACC-019'],
    ['REQ-AOS-018', 'AOS-ACC-020'],
  ]);
});

test('every locked suite covers its own contract revision', () => {
  const results = validateAllSuites();
  assert.deepEqual(results.flatMap((result) => result.errors), []);
  assert.deepEqual(results.map((result) => result.contractCount), [65, 69, 71, 153, 34, 114, 116, 118, 71]);
  assert.deepEqual(results.map((result) => result.matrixCount), [65, 69, 71, 153, 34, 114, 116, 118, 71]);
});

test('contract discovery supports quoted and plain YAML identifiers', () => {
  for (const quote of ['', '"', "'"]) {
    const source = `id: ${quote}career-evidence-platform${quote}\nversion: ${quote}0.1.0${quote}\n  - id: ${quote}REQ-CEP-001${quote}\n  - id: ${quote}ACC-CEP-001${quote}\n`;
    assert.deepEqual(contractMetadata(source), { id: 'career-evidence-platform', version: '0.1.0' });
    assert.deepEqual(contractClauses(source), ['ACC-CEP-001', 'REQ-CEP-001']);
  }
  assert.deepEqual(contractClauses('statement: \"id: REQ-CEP-999\"\n# id: REQ-CEP-998'), []);
});

test('the Agent OS profile requires the complete public validation surface', () => {
  const result = validateAgentOsProfile();
  assert.deepEqual(result.errors, []);
  assert.equal(result.requiredCaseCount, 25);
});

test('the Collaborative Workspace contract is pinned by revision and content', () => {
  const result = validateContractLock('collaborative-workspace', '0.1.0');
  assert.deepEqual(result.errors, []);
  assert.equal(result.metadata.version, '0.1.0');
  assert.equal(result.clauses.length, 153);
});

test('the Collaborative Workspace profile requires its full planned validation surface', () => {
  const result = validateCollaborativeWorkspaceProfile();
  assert.deepEqual(result.errors, []);
  assert.equal(result.requiredCaseCount, 41);
});

test('the video contract is pinned by committed revision and content', () => {
  const target = lockedContract('video-editorial-workflow', '0.3.1');
  const result = validateContractLock('video-editorial-workflow', '0.3.1');
  assert.deepEqual(result.errors, []);
  assert.equal(result.actualRevision, target.revision);
  assert.equal(result.actualBlob, target.contentBlob);
  assert.equal(result.metadata.version, '0.3.1');
  assert.equal(result.clauses.length, 34);
});

test('the video profile version matches the contract declaration independently of the contract version', () => {
  const result = validateProfile('video-editorial-workflow', '0.3.1');
  assert.deepEqual(result.errors, []);
  assert.equal(result.profile.version, '0.1.0');
  assert.equal(result.profile.contract.version, '0.3.1');
  assert.match(lockedContractSource('video-editorial-workflow', '0.3.1'),
    /validation_profile:\s*\n\s+id: "video-editorial-workflow\/conformance"\s*\n\s+version: "0.1.0"/);
  const manifest = readJson('suites/video-editorial-workflow/0.3.1/manifest.json');
  assert.deepEqual(new Set(result.profile.requiredCases), new Set(manifest.cases.map((entry) => entry.id)));
  assert.equal(result.requiredCaseCount, 12);
  assert.ok(manifest.cases.every((entry) => entry.status === 'planned' && entry.steps.length > 0 && entry.assertions.length > 0));
});

test('reference source bytes reproduce exactly and every selected interval is in bounds', () => {
  const temporary = mkdtempSync(resolve(tmpdir(), 'composed-media-test-'));
  try {
    const first = generateMedia(resolve(temporary, 'first'));
    const second = generateMedia(resolve(temporary, 'second'));
    assert.deepEqual(first, second);
    assert.notEqual(first.sources[0].sha256, first.sources[1].sha256);
    const fixture = readJson('suites/video-editorial-workflow/0.3.1/fixtures/reference-interview.json');
    for (const source of first.sources) {
      const bytes = readFileSync(resolve(temporary, 'first', source.file));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.length, source.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
    }
    for (const segment of fixture.selection) {
      const source = first.sources.find((entry) => entry.id === segment.source);
      assert.ok(source && segment.startSeconds >= 0 && segment.endSeconds > segment.startSeconds && segment.endSeconds <= source.durationSeconds);
    }
    assert.equal(fixture.selection[0].source, 'asset-b');
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
