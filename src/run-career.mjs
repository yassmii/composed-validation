import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JsonlAdapter } from './jsonl-adapter.mjs';
import { contractLock, suiteManifest, validateContractLock, validateSuite, validateProfile, readJson } from './lib.mjs';
import { digest, evaluateAssertions, evaluateReview, immutableRevision, loadReviews, validateCareerCases } from './career-checks.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contractId = 'career-evidence-platform';
// The default stays the first published profile so existing commands keep their meaning.
const defaultVersion = '0.1.0';
const timestamp = () => new Date().toISOString();

function secrets(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    (/^(password|secret|token|accessToken|refreshToken|apiKey|authorization)$/i.test(key) && child !== null && !['[redacted]', '<redacted>', 'REDACTED'].includes(child)) || secrets(child));
}

export async function runCareer({ command, args = [], output, reviewsPath, timeoutMs = 30_000, contractVersion = defaultVersion }) {
  if (!command || !output) throw new Error('Adapter command and report directory are required.');
  const version = contractVersion;
  if (!contractLock().contracts[contractId]?.[version]) throw new Error(`No ${contractId} lock exists for ${version}.`);
  const suitePath = `suites/${contractId}/${version}`;
  const manifest = suiteManifest(contractId, version);
  // A suite that extends an earlier one is judged with every manifest and matrix it inherits.
  const inherited = [];
  for (let parent = readJson(`${suitePath}/manifest.json`).extends; parent; parent = readJson(`suites/${contractId}/${parent}/manifest.json`).extends) inherited.push(`suites/${contractId}/${parent}/manifest.json`, `suites/${contractId}/${parent}/conformance-matrix.json`);
  const fixture = readJson(`${suitePath}/fixtures/synthetic-career.json`);
  const errors = [validateContractLock(contractId, version), validateSuite(contractId, version), validateProfile(contractId, version)].flatMap((entry) => entry.errors).concat(validateCareerCases(manifest));
  if (errors.length) throw new Error(`Invalid locked suite: ${errors.join(' ')}`);
  const target = contractLock().contracts[contractId][version];
  const profileVersion = target.profileVersion ?? version;
  const outputPath = resolve(output);
  // Refuse to overwrite a prior evidence run, including from parallel runners.
  mkdirSync(outputPath, { recursive: false });
  const artifactsPath = resolve(outputPath, 'artifacts');
  mkdirSync(artifactsPath);
  const artifacts = [];
  function save(name, value) {
    const text = `${JSON.stringify(value, null, 2)}\n`;
    writeFileSync(resolve(artifactsPath, name), text, { flag: 'wx' });
    const artifact = { path: `artifacts/${name}`, sha256: digest(text) };
    artifacts.push(artifact);
    return artifact;
  }
  const report = {
    format: 'composed-validation-evidence/v1', suite: manifest.suite,
    profile: `${contractId}/conformance@${profileVersion}`,
    contract: { id: contractId, version, revision: target.revision, contentBlob: target.contentBlob },
    command: [command, ...args], adapterVersion: null, target: null,
    environment: { node: process.version, platform: process.platform, architecture: process.arch, inheritedEnvironment: 'PATH, SystemRoot, WINDIR, TEMP, TMP, TMPDIR, LANG, TZ only' },
    startedAt: timestamp(), finishedAt: null, cases: [], artifacts,
    fullProfilePassed: false, corePassed: false,
    limitations: ['Black-box observations are supplied through an implementation-owned adapter; validate its translation separately.', 'Synthetic fixture runs are not an estimate of career-model effectiveness.', 'External human judgments remain attributable to their reviewers.'],
  };
  const sourcePaths = ['src/run-career.mjs', 'src/jsonl-adapter.mjs', 'src/career-checks.mjs', 'src/lib.mjs', 'package.json', 'contracts.lock.json', `${suitePath}/manifest.json`, `${suitePath}/conformance-matrix.json`, `${suitePath}/fixtures/synthetic-career.json`, `profiles/${contractId}/${profileVersion}/profile.json`, ...inherited];
  report.harnessInputs = save('harness-inputs.json', sourcePaths.map((path) => ({ path, sha256: digest(readFileSync(resolve(root, path))) })));
  const adapter = new JsonlAdapter(command, args, { timeoutMs });
  let targetRevision;
  async function call(operation, payload) {
    const { response, elapsedMs } = await adapter.request(operation, payload);
    if (secrets(response)) throw new Error('Adapter returned an unredacted secret-like field; response was not retained.');
    if (typeof response.ok !== 'boolean' || typeof response.operationId !== 'string' || !response.operationId || !immutableRevision.test(response.targetRevision ?? '') || !Number.isFinite(Date.parse(response.startedAt)) || !Number.isFinite(Date.parse(response.finishedAt)) || Date.parse(response.finishedAt) < Date.parse(response.startedAt) || !Object.hasOwn(response, 'result') || !Array.isArray(response.diagnostics)) throw new Error('Adapter response envelope is invalid.');
    if (targetRevision && response.targetRevision !== targetRevision) throw new Error('Candidate revision changed during the run.');
    if (response.ok !== true) {
      const error = new Error('Adapter could not perform the requested operation.');
      error.verdict = operation === 'inject' && ['unsupported_fault', 'not_reproducible'].includes(response.result?.code) ? 'blocked' : 'fail';
      throw error;
    }
    return { response, elapsedMs };
  }
  try {
    const { response: description } = await call('describe', {});
    targetRevision = description.targetRevision;
    const info = description.result;
    if (!info || typeof info.name !== 'string' || !info.name || typeof info.adapterVersion !== 'string' || !info.adapterVersion || !['candidate', 'harness-control'].includes(info.kind) || info.isolationMode !== 'disposable' || !Array.isArray(info.capabilities) || !info.contracts?.some((entry) => entry.id === contractId && entry.version === version) || !info.suites?.includes(manifest.suite)) throw new Error('Adapter description must identify its immutable target, adapter version, disposable isolation, capabilities, contract and suite.');
    report.target = { name: info.name, revision: targetRevision, kind: info.kind, isolationMode: info.isolationMode, capabilities: info.capabilities };
    report.adapterVersion = info.adapterVersion;
    save('description.json', description);
    const reviews = loadReviews(reviewsPath, targetRevision, target.revision);
    const knownCases = new Set(manifest.cases.map((entry) => entry.id));
    if ([...reviews.keys()].some((id) => !knownCases.has(id))) throw new Error('Review bundle references an unknown case.');

    for (const testCase of manifest.cases) {
      const row = { id: testCase.id, claims: testCase.claims, startedAt: timestamp(), finishedAt: null, verdict: 'blocked', reason: '', artifacts: [], assertions: [], review: null };
      report.cases.push(row);
      if (testCase.requiresCapability && !info.capabilities.includes(testCase.requiresCapability)) {
        row.verdict = 'not_run'; row.reason = `Optional capability ${testCase.requiresCapability} is not offered.`; row.finishedAt = timestamp();
        continue;
      }
      let tenantId;
      const transcript = [];
      try {
        const { response: reset } = await call('reset', { caseId: testCase.id, fixture, testMode: true });
        tenantId = reset.result?.tenantId;
        if (typeof tenantId !== 'string' || !tenantId || reset.result.isolationMode !== 'disposable') throw new Error('Reset did not return a disposable tenant.');
        transcript.push({ operation: 'reset', response: reset });
        const timings = [];
        let observation;
        for (const step of testCase.steps) {
          const result = await call(step.operation, { tenantId, caseId: testCase.id, name: step.name, arguments: step.arguments });
          transcript.push({ operation: step.operation, name: step.name, response: result.response, elapsedMs: result.elapsedMs });
          if (step.name === 'acknowledge-interactive-task') timings.push(result.elapsedMs);
          if (step.operation === 'inspect') observation = result.response.result;
        }
        row.assertions = evaluateAssertions(testCase.assertions, observation, timings);
        const review = evaluateReview(testCase, reviews);
        const { artifacts: reviewArtifacts, ...reviewRecord } = review;
        row.review = reviewRecord;
        for (const [index, artifact] of reviewArtifacts.entries()) {
          const name = `${testCase.id}-review-${index}.artifact`;
          // Copy and verify the bytes retained by this run, not just the source path.
          const retained = resolve(artifactsPath, name);
          copyFileSync(artifact.source, retained, 1);
          if (digest(readFileSync(retained)) !== artifact.sha256) throw new Error('Review artifact changed while being retained.');
          const reference = { path: `artifacts/${name}`, sha256: artifact.sha256 };
          artifacts.push(reference); row.artifacts.push(reference);
        }
        row.verdict = row.assertions.some((check) => !check.pass) ? 'fail' : review.verdict;
        row.reason = row.verdict === 'fail' && row.assertions.some((check) => !check.pass) ? 'One or more observable assertions failed.' : review.reason ?? 'Observable assertions passed.';
      } catch (error) {
        row.verdict = error.verdict ?? 'fail'; row.reason = error.message;
      } finally {
        // Dispose a reset attempt even when its response was malformed or timed out.
        try {
          const { response } = await call('dispose', { tenantId: tenantId ?? null, caseId: testCase.id });
          transcript.push({ operation: 'dispose', response });
          if (response.result?.disposed !== true) throw new Error('Cleanup was not confirmed.');
          row.cleanup = 'confirmed';
        } catch {
          row.cleanup = 'unconfirmed'; row.verdict = 'fail'; row.reason = 'Disposable tenant cleanup was not confirmed.';
        }
        row.artifacts.push(save(`${testCase.id}.json`, transcript));
        row.finishedAt = timestamp();
      }
    }
    report.summary = Object.fromEntries(['pass', 'fail', 'blocked', 'not_run'].map((verdict) => [verdict, report.cases.filter((entry) => entry.verdict === verdict).length]));
    const allRequired = report.cases.length === manifest.cases.length && report.cases.every((entry) => entry.verdict === 'pass');
    const core = report.cases.filter((row) => !manifest.cases.find((entry) => entry.id === row.id).requiresCapability);
    // A simulated control must never create a product-conformance claim.
    report.corePassed = info.kind === 'candidate' && core.every((entry) => entry.verdict === 'pass');
    report.fullProfilePassed = info.kind === 'candidate' && allRequired;
    report.verdict = report.summary.fail ? 'fail' : report.summary.blocked ? 'blocked' : report.summary.not_run ? 'not_run' : 'pass';
  } catch (error) {
    report.verdict = 'blocked'; report.reason = error.message;
  } finally {
    adapter.close();
    report.finishedAt = timestamp();
    const reportBytes = `${JSON.stringify(report, null, 2)}\n`;
    writeFileSync(resolve(outputPath, 'report.json'), reportBytes, { flag: 'wx' });
    writeFileSync(resolve(outputPath, 'report.sha256'), `${digest(reportBytes)}  report.json\n`, { flag: 'wx' });
  }
  return report;
}

async function main() {
  const input = process.argv.slice(2);
  const separator = input.indexOf('--');
  const options = separator < 0 ? input : input.slice(0, separator);
  const args = separator < 0 ? [] : input.slice(separator + 1);
  const values = {};
  for (let index = 0; index < options.length; index += 2) {
    if (!['--adapter', '--output', '--reviews', '--timeout-ms', '--contract-version'].includes(options[index]) || !options[index + 1]) throw new Error('Usage: node src/run-career.mjs --adapter EXECUTABLE --output NEW_DIRECTORY [--contract-version VERSION] [--reviews BUNDLE] [--timeout-ms N] -- [ADAPTER_ARGS...]');
    values[options[index]] = options[index + 1];
  }
  const timeoutMs = Number(values['--timeout-ms'] ?? 30_000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) throw new Error('Timeout must be a positive number of milliseconds.');
  const report = await runCareer({ command: values['--adapter'], args, output: values['--output'], reviewsPath: values['--reviews'], timeoutMs, contractVersion: values['--contract-version'] ?? defaultVersion });
  console.log(JSON.stringify({ report: resolve(values['--output'], 'report.json'), verdict: report.verdict, summary: report.summary, fullProfilePassed: report.fullProfilePassed }));
  process.exitCode = report.verdict === 'pass' ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
