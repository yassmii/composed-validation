/** Synthetic positive/negative protocol control for suite 1.0.1. This is not a product candidate. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { isDeepStrictEqual } from 'node:util';

// The 1.0.1 suite extends 0.1.0: inherited cases replay the earlier recording.
const sources = ['../manifest.json', './positive-observations.json', '../../0.1.0/manifest.json', '../../0.1.0/fixtures/positive-observations.json']
  .map((path) => readFileSync(new URL(path, import.meta.url)));
const hash = createHash('sha256').update(readFileSync(new URL(import.meta.url)));
for (const bytes of sources) hash.update(bytes);
const revision = hash.digest('hex');
const [manifest, added, parentManifest, parentRecording] = sources.map((bytes) => JSON.parse(bytes));
const cases = new Map([...parentManifest.cases, ...manifest.cases].map((entry) => [entry.id, entry]));
const recordings = { ...parentRecording.observations, ...added.observations };
const mutationIndex = process.argv.indexOf('--mutation');
const mutation = mutationIndex >= 0 ? process.argv[mutationIndex + 1] : '';
const disabled = process.argv.includes('--no-optionals');
const tenants = new Map();
let sequence = 0;

function mutate(id, observation) {
  if (id === 'CEP-ACC-023') {
    if (mutation === 'aggregate-confirms') observation.verdict = 'confirmed';
    if (mutation === 'slice-dropped') observation.slices = observation.slices.filter((row) => row.id !== 'fr/care');
    if (mutation === 'slice-count-hidden') delete observation.slices[2].sampleCount;
    if (mutation === 'slice-relabelled') observation.slices[2].passed = true;
    if (mutation === 'tuning-accepted') observation.tuningCasesAttempt.accepted = true;
    if (mutation === 'tuning-in-confirmation') observation.tuningCasesInConfirmation = 2;
    if (mutation === 'declared-late') observation.declaration.frozenBeforeComparison = false;
  }
  if (id === 'CEP-ACC-024') {
    if (mutation === 'wrong-precision') observation.known.precision = { numerator: 3, denominator: 3 };
    if (mutation === 'zero-for-unknown') observation.unexecuted.precision = { status: 'reported', value: 0 };
    if (mutation === 'unknown-with-number') observation.unexecuted.recall.value = 1;
    if (mutation === 'abstention-as-quality') observation.allAbstention.supportedAnswerQuality = { status: 'reported', value: 1 };
    if (mutation === 'merged-measures') observation.separateMeasures = { overall: { task: 'overall', status: 'reported', sampleCount: 5 } };
  }
  return observation;
}

for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  const request = JSON.parse(line);
  const response = { requestId: request.requestId, ok: true, operationId: `control-op-${++sequence}`, targetRevision: revision, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), result: null, diagnostics: [] };
  try {
    if (request.operation === 'describe') {
      response.result = { name: 'career-synthetic-replay-control', kind: 'harness-control', adapterVersion: '1.0.0', isolationMode: 'disposable', contracts: [{ id: 'career-evidence-platform', version: '1.0.1' }], suites: [manifest.suite], capabilities: disabled ? [] : ['CAP-CEP-007', 'CAP-CEP-011', 'CAP-CEP-012', 'CAP-CEP-013'] };
    } else if (request.operation === 'reset') {
      if (request.testMode !== true || request.fixture?.synthetic !== true || !request.fixture.evaluationControls) throw new Error('Disposable synthetic 1.0.1 fixture required.');
      const testCase = cases.get(request.caseId);
      if (!testCase) throw new Error('Unknown case.');
      const tenantId = `control-tenant-${sequence}`;
      tenants.set(tenantId, { testCase, index: 0 });
      response.result = { tenantId, isolationMode: 'disposable' };
    } else if (request.operation === 'dispose') {
      if (request.tenantId) tenants.delete(request.tenantId);
      response.result = { disposed: true };
    } else {
      const state = tenants.get(request.tenantId);
      const expected = state?.testCase.steps[state.index];
      if (!expected || expected.operation !== request.operation || expected.name !== request.name || !isDeepStrictEqual(expected.arguments, request.arguments)) throw new Error('Runner deviated from the scenario action sequence.');
      state.index++;
      response.result = request.operation === 'inspect'
        ? mutate(request.caseId, structuredClone(recordings[request.caseId]))
        : { applied: request.name };
    }
  } catch {
    response.ok = false; response.result = { code: 'invalid_control_request' };
  }
  process.stdout.write(`${JSON.stringify(response)}\n`);
}
