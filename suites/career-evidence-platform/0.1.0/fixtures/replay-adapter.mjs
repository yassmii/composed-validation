/** Synthetic positive/negative protocol control. This is not a product candidate. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { isDeepStrictEqual } from 'node:util';

const manifestBytes = readFileSync(new URL('../manifest.json', import.meta.url));
const recordingBytes = readFileSync(new URL('./positive-observations.json', import.meta.url));
const selfBytes = readFileSync(new URL(import.meta.url));
const revision = createHash('sha256').update(selfBytes).update(manifestBytes).update(recordingBytes).digest('hex');
const manifest = JSON.parse(manifestBytes);
const recordings = JSON.parse(recordingBytes).observations;
const mutationIndex = process.argv.indexOf('--mutation');
const mutation = mutationIndex >= 0 ? process.argv[mutationIndex + 1] : '';
const disabled = process.argv.includes('--no-optionals');
const tenants = new Map();
let sequence = 0;

function mutate(id, observation) {
  if (mutation === 'leak' && id === 'CEP-ACC-013') observation.returnedText += ' OTHER-OWNER-CANARY';
  if (mutation === 'certification' && id === 'CEP-ACC-005') observation.certifiedMastery = true;
  if (mutation === 'charges' && id === 'CEP-ACC-015') observation.charges = 2;
  if (mutation === 'consent' && id === 'CEP-ACC-016') observation.marketingEnrollments = 1;
  if (mutation === 'mapping' && id === 'CEP-ACC-007') observation.priorRelation = 'exact';
  if (mutation === 'restore' && id === 'CEP-ACC-014') observation.servedErasedSources = ['contract-a'];
  if (mutation === 'false-completion' && id === 'CEP-ACC-002') observation.failedState = 'completed';
  if (mutation === 'evaluation' && id === 'CEP-ACC-021') observation.candidateCaseIds = ['different-evaluation-set'];
  if (mutation === 'blanket-sota' && id === 'CEP-ACC-021') observation.blanketSotaClaim = true;
  if (id === 'CEP-QA-006') {
    if (mutation === 'export-rich') {
      for (const [category, count] of Object.entries({ Entities: 6, TypedLinks: 6, Versions: 3, Markers: 7 })) {
        observation[`expected${category}`] = count;
        observation[`read${category}`] = count;
      }
    }
    if (mutation === 'export-unreconciled') observation.unreconciledEntities = 1;
    if (mutation === 'export-below-minimum') observation.expectedEntities = observation.readEntities = 3;
  }
  if (id === 'CEP-ACC-004') {
    if (mutation === 'split-sources') observation.splitPreviewSourceIds = [['cv-a', 'contract-a']];
    if (mutation === 'split-cancel-changed') observation.recordUnchangedAfterCancelSplit = false;
  }
  return observation;
}

for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  const request = JSON.parse(line);
  const response = { requestId: request.requestId, ok: true, operationId: `control-op-${++sequence}`, targetRevision: revision, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), result: null, diagnostics: [] };
  try {
    if (request.operation === 'describe') {
      if (mutation === 'timeout') continue;
      response.result = { name: 'career-synthetic-replay-control', kind: 'harness-control', adapterVersion: '0.1.0', isolationMode: 'disposable', contracts: [{ id: 'career-evidence-platform', version: '0.1.0' }], suites: [manifest.suite], capabilities: disabled ? [] : ['CAP-CEP-007', 'CAP-CEP-011', 'CAP-CEP-012', 'CAP-CEP-013'] };
      if (mutation === 'bad-envelope') delete response.operationId;
      if (mutation === 'secret-field') response.diagnostics.push({ apiKey: 'UNREDACTED-CONTROL-SECRET' });
      if (mutation === 'stderr-secret') process.stderr.write('UNREDACTED-STDERR-CONTROL-SECRET\n');
    } else if (request.operation === 'reset') {
      if (request.testMode !== true || request.fixture?.synthetic !== true) throw new Error('Disposable synthetic fixture required.');
      const testCase = manifest.cases.find((entry) => entry.id === request.caseId);
      if (!testCase) throw new Error('Unknown case.');
      const tenantId = `control-tenant-${sequence}`;
      tenants.set(tenantId, { testCase, index: 0 });
      response.result = { tenantId, isolationMode: 'disposable' };
    } else if (request.operation === 'dispose') {
      if (request.tenantId) tenants.delete(request.tenantId);
      response.result = { disposed: mutation !== 'cleanup' };
    } else {
      const state = tenants.get(request.tenantId);
      const expected = state?.testCase.steps[state.index];
      if (!expected || expected.operation !== request.operation || expected.name !== request.name || !isDeepStrictEqual(expected.arguments, request.arguments)) throw new Error('Runner deviated from the scenario action sequence.');
      state.index++;
      if (mutation === 'unsupported-fault' && request.operation === 'inject') {
        response.ok = false; response.result = { code: 'unsupported_fault' };
      } else if (request.operation === 'inspect') {
        response.result = mutate(request.caseId, structuredClone(recordings[request.caseId]));
        if (mutation === 'revision-drift') response.targetRevision = '0'.repeat(40);
      } else {
        response.result = { applied: request.name };
      }
    }
  } catch {
    response.ok = false; response.result = { code: 'invalid_control_request' };
  }
  process.stdout.write(`${JSON.stringify(response)}\n`);
}
