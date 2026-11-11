import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

const operators = new Set(['equal', 'not_contains', 'nonempty', 'gte', 'lte', 'p95_lte', 'benchmark']);
const operations = new Set(['execute', 'inspect', 'inject']);
export const immutableRevision = /^(?:[a-f0-9]{40}|[a-f0-9]{64}|sha256:[a-f0-9]{64})$/;
export const digest = (value) => createHash('sha256').update(value).digest('hex');

export function validateCareerCases(manifest) {
  const errors = [];
  for (const entry of manifest.cases ?? []) {
    if (!entry.steps?.length || !entry.assertions?.length) errors.push(`${entry.id} needs steps and executable assertions.`);
    for (const step of entry.steps ?? []) {
      if (!operations.has(step.operation) || !step.name || !step.arguments || typeof step.arguments !== 'object') errors.push(`${entry.id} has an invalid action.`);
    }
    for (const check of entry.assertions ?? []) {
      if (!check.path || !operators.has(check.operator) || (check.operator !== 'benchmark' && !Object.hasOwn(check, 'expected'))) errors.push(`${entry.id} has an invalid assertion.`);
    }
    if (entry.requiresCapability && !/^CAP-CEP-(007|011|012|013)$/.test(entry.requiresCapability)) errors.push(`${entry.id} has an invalid optional capability.`);
    if (entry.review && (!entry.review.kind || entry.review.required !== true || !entry.review.clauses?.length || entry.review.clauses.some((id) => !entry.claims.includes(id)))) errors.push(`${entry.id} has an invalid review boundary.`);
  }
  return errors;
}

function at(value, path) {
  return path === '$' ? value : path.split('.').reduce((object, key) => object?.[key], value);
}
const finiteNonnegative = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function benchmark(value) {
  const rates = ['extractionPrecision', 'extractionRecall', 'linkingTopK', 'unsupportedClaimRate', 'temporalAccuracy', 'humanCareerRelevance', 'abstentionRate'];
  if (!value || value.split !== 'heldout' || !value.corpusId || !value.population || !value.languages?.length) return false;
  if (!Array.isArray(value.baselineCaseIds) || value.baselineCaseIds.length === 0 || new Set(value.baselineCaseIds).size !== value.baselineCaseIds.length) return false;
  if (!isDeepStrictEqual([...value.baselineCaseIds].sort(), [...(value.candidateCaseIds ?? [])].sort())) return false;
  if (!Array.isArray(value.modelVersions) || value.modelVersions.length < 2 || value.modelVersions.some((version) => typeof version !== 'string' || !version)) return false;
  if (rates.some((name) => !finiteNonnegative(value.metrics?.[name]) || value.metrics[name] > 1)) return false;
  for (const name of ['baseline', 'candidate']) if (!finiteNonnegative(value[name]?.cost) || !finiteNonnegative(value[name]?.latencyMs)) return false;
  if (!Array.isArray(value.regressions)) return false;
  for (const name of ['cost', 'latencyMs']) if (value.candidate[name] > value.baseline[name] && !value.regressions.includes(name)) return false;
  return value.blanketSotaClaim === false && value.routineTelemetryContainsBodies === false;
}

export function evaluateAssertions(assertions, observation, timings = []) {
  return assertions.map((check) => {
    const actual = check.path === '$timings' ? timings : at(observation, check.path);
    let pass = false;
    switch (check.operator) {
      case 'equal': pass = actual !== undefined && isDeepStrictEqual(actual, check.expected); break;
      case 'not_contains': pass = typeof actual === 'string' && !actual.includes(check.expected); break;
      case 'nonempty': pass = typeof actual === 'string' && actual.trim().length > 0; break;
      case 'gte': pass = finiteNonnegative(actual) && actual >= check.expected; break;
      case 'lte': pass = finiteNonnegative(actual) && actual <= check.expected; break;
      case 'p95_lte': {
        const sorted = Array.isArray(actual) ? [...actual].sort((a, b) => a - b) : [];
        pass = sorted.length >= 20 && sorted.every(finiteNonnegative) && sorted[Math.ceil(sorted.length * 0.95) - 1] <= check.expected;
        break;
      }
      case 'benchmark': pass = benchmark(actual); break;
      default: throw new Error(`Unknown assertion operator: ${check.operator}`);
    }
    // Do not copy potentially private candidate values into failure messages.
    return { path: check.path, operator: check.operator, pass };
  });
}

export function loadReviews(path, targetRevision, contractRevision) {
  if (!path) return new Map();
  const document = JSON.parse(readFileSync(path, 'utf8'));
  if (document.format !== 'career-review-bundle/v1' || document.targetRevision !== targetRevision || document.contractRevision !== contractRevision || !Array.isArray(document.reviews)) throw new Error('Review bundle identity does not match this target and locked contract.');
  const reviews = new Map();
  for (const entry of document.reviews) {
    if (!entry.caseId || reviews.has(entry.caseId)) throw new Error('Review bundle has duplicate or missing case IDs.');
    reviews.set(entry.caseId, { ...entry, directory: dirname(realpathSync(path)) });
  }
  return reviews;
}

export function evaluateReview(testCase, reviews) {
  if (!testCase.review) return { verdict: 'pass', artifacts: [] };
  const entry = reviews.get(testCase.id);
  const blocked = (reason) => ({ verdict: 'blocked', reason, artifacts: [] });
  if (!entry) return blocked(`External ${testCase.review.kind} review is missing.`);
  if (entry.kind !== testCase.review.kind || typeof entry.reviewer !== 'string' || !entry.reviewer.trim() || typeof entry.method !== 'string' || !entry.method.trim() || !Number.isFinite(Date.parse(entry.performedAt)) || !['pass', 'fail'].includes(entry.verdict) || !entry.artifacts?.length) return blocked('Review attribution, method, verdict, date or artifacts are incomplete.');
  const artifacts = [];
  try {
    for (const artifact of entry.artifacts) {
      if (!artifact.path || isAbsolute(artifact.path) || !/^[a-f0-9]{64}$/.test(artifact.sha256)) return blocked('Review artifact reference is invalid.');
      const absolute = realpathSync(resolve(entry.directory, artifact.path));
      const scoped = relative(entry.directory, absolute);
      if (scoped.startsWith('..') || isAbsolute(scoped)) return blocked('Review artifacts must remain inside the bundle directory.');
      const bytes = readFileSync(absolute);
      if (bytes.length === 0 || digest(bytes) !== artifact.sha256) return blocked('Review artifact is empty or its hash differs.');
      artifacts.push({ source: absolute, sha256: artifact.sha256 });
    }
  } catch {
    return blocked('Review artifact cannot be reproduced.');
  }
  if (entry.verdict === 'fail') return { verdict: 'fail', reason: 'External reviewer recorded a failure.', artifacts };
  if (entry.kind === 'usability') {
    const rows = entry.data?.participants;
    if (!Array.isArray(rows) || rows.length < 10 || !entry.data.population || new Set(rows.map((row) => row.id)).size !== rows.length || rows.some((row) => !row.id || row.firstTime !== true || !finiteNonnegative(row.activeSeconds) || !finiteNonnegative(row.waitingSeconds) || !finiteNonnegative(row.helpCount) || !finiteNonnegative(row.errorCount) || !Array.isArray(row.completedTasks)) || !rows.some((row) => row.hasRecommendationLetters === false)) return blocked('Usability study requires distinct first-time participants, population, timing, errors, help and a participant without recommendation letters.');
    const tasks = ['intake', 'inspect', 'correct', 'prepare-share'];
    const successful = rows.filter((row) => row.activeSeconds <= 900 && row.helpCount === 0 && tasks.every((task) => row.completedTasks.includes(task))).length;
    if (successful / rows.length < 0.8) return { verdict: 'fail', reason: 'Study does not meet MET-CEP-001: 80% within 15 active minutes without facilitator help.', artifacts };
  }
  return { verdict: 'pass', reason: 'External review and its hashed evidence were supplied; substantive judgment remains attributable to the reviewer.', artifacts, reviewer: entry.reviewer, method: entry.method, performedAt: entry.performedAt };
}
