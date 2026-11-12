import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { validateCareerCases } from './career-checks.mjs';
import { validateStructuredSuite, validateStructuredProfile } from './structured-checks.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const composedRoot = resolve(repositoryRoot, '../composed');
const clausePattern = /^\s*(?:-\s+)?id:\s+["']?((?:REQ|INV|POL|QA|ACC)-[A-Z0-9]+-\d{3})["']?\s*(?:#.*)?$/gm;
const allowedCaseStatuses = new Set(['planned', 'pass', 'fail', 'blocked', 'not_run']);
const requiredOperations = ['describe', 'reset', 'execute', 'inspect', 'inject', 'dispose'];

export function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(repositoryRoot, relativePath), 'utf8'));
}

export function contractLock() {
  return readJson('contracts.lock.json');
}

export function targetVersion(contractId = 'agent-os') {
  const environmentName = `COMPOSED_${contractId.replaceAll('-', '_').toUpperCase()}_CONTRACT_VERSION`;
  return process.env[environmentName]
    ?? (contractId === 'agent-os' ? process.env.COMPOSED_CONTRACT_VERSION : undefined)
    ?? Object.keys(contractLock().contracts[contractId] ?? {}).at(-1);
}

export function lockedContract(contractId = 'agent-os', version = targetVersion(contractId)) {
  const target = contractLock().contracts[contractId]?.[version];
  if (!target) throw new Error(`No ${contractId} lock exists for ${version ?? 'an unspecified version'}.`);
  return { ...target, id: contractId, version };
}

export function contractPath(contractId = 'agent-os', version = targetVersion(contractId)) {
  const target = lockedContract(contractId, version);
  const environmentName = `COMPOSED_${contractId.replaceAll('-', '_').toUpperCase()}_CONTRACT_PATH`;
  const override = process.env[environmentName]
    ?? (contractId === 'agent-os' ? process.env.COMPOSED_CONTRACT_PATH : undefined);
  return resolve(override ?? resolve(composedRoot, target.path));
}

export function readContract(contractId = 'agent-os', version = targetVersion(contractId)) {
  return readFileSync(contractPath(contractId, version), 'utf8');
}

export function contractClauses(source) {
  return [...new Set([...(source ?? '').matchAll(clausePattern)].map((match) => match[1]))].sort();
}

export function contractMetadata(source) {
  const id = source.match(/^id:\s+["']?([a-z0-9-]+)["']?\s*$/m)?.[1];
  const version = source.match(/^version:\s+["']?([\w.+-]+)["']?\s*$/m)?.[1];
  return { id, version };
}

export function contractRevision(path) {
  const sourceRepository = resolve(dirname(path), '../../../../');
  return execFileSync('git', ['-C', sourceRepository, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

export function contractBlob(path) {
  return execFileSync('git', ['hash-object', path], { encoding: 'utf8' }).trim();
}

export function lockedContractSource(contractId = 'agent-os', version = targetVersion(contractId)) {
  return contractSource(contractId, version).source;
}

function contractSource(contractId, version) {
  const target = lockedContract(contractId, version);
  const sourceRepository = resolve(dirname(contractPath(contractId, version)), '../../../../');
  const git = (...args) => execFileSync('git', ['-C', sourceRepository, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    actualRevision: git('rev-parse', `${target.revision}^{commit}`).trim(),
    actualBlob: git('rev-parse', `${target.revision}:${target.path}`).trim(),
    source: git('show', `${target.revision}:${target.path}`),
  };
}

export function validateContractLock(contractId = 'agent-os', version = targetVersion(contractId)) {
  const expected = lockedContract(contractId, version);
  const errors = [];
  let source = '';
  let actualRevision;
  let actualBlob;

  try {
    ({ actualRevision, actualBlob, source } = contractSource(contractId, version));
  } catch (error) {
    errors.push(`Locked source ${expected.revision}:${expected.path} is unavailable: ${error.message.split('\n')[0]}.`);
  }
  const metadata = contractMetadata(source);

  if (metadata.id !== contractId) errors.push(`Expected contract id ${contractId}, received ${metadata.id ?? 'none'}.`);
  if (metadata.version !== expected.version) errors.push(`Expected contract version ${expected.version}, received ${metadata.version ?? 'none'}.`);
  if (actualRevision && actualRevision !== expected.revision) errors.push(`Expected Composed revision ${expected.revision}, received ${actualRevision}.`);
  if (actualBlob && actualBlob !== expected.contentBlob) errors.push(`Expected contract content blob ${expected.contentBlob}, received ${actualBlob}.`);
  if (expected.contentSha256 && createHash('sha256').update(source).digest('hex') !== expected.contentSha256) errors.push('Locked contract SHA-256 differs from the retrieved content.');
  return { errors, expected, metadata, actualRevision, actualBlob, clauses: contractClauses(source) };
}

export function validateAllContractLocks() {
  return Object.entries(contractLock().contracts).flatMap(([contractId, versions]) =>
    Object.keys(versions).map((version) => ({ contractId, version, ...validateContractLock(contractId, version) })),
  );
}

export function suiteManifest(contractId, version) {
  const manifest = readJson(`suites/${contractId}/${version}/manifest.json`);
  if (!manifest.extends) return manifest;
  const parent = suiteManifest(contractId, manifest.extends);
  const cases = new Map(parent.cases.map((entry) => [entry.id, entry]));
  for (const override of manifest.overrides ?? []) {
    if (!cases.has(override.id)) throw new Error(`Manifest ${contractId}/${version} overrides unknown case ${override.id}.`);
    cases.set(override.id, { ...cases.get(override.id), ...override });
  }
  for (const entry of manifest.cases ?? []) cases.set(entry.id, entry);
  return { ...manifest, cases: [...cases.values()] };
}

function suiteMatrix(contractId, version) {
  const matrix = readJson(`suites/${contractId}/${version}/conformance-matrix.json`);
  if (!matrix.extends) return matrix;
  const parent = suiteMatrix(contractId, matrix.extends);
  const entries = new Map(parent.entries.map((entry) => [entry.clause, entry]));
  for (const override of matrix.overrides ?? []) entries.set(override.clause, override);
  for (const entry of matrix.entries ?? []) entries.set(entry.clause, entry);
  return { ...matrix, entries: [...entries.values()] };
}

export function validateSuite(contractId = 'agent-os', version = targetVersion(contractId)) {
  const manifest = suiteManifest(contractId, version);
  const matrix = suiteMatrix(contractId, version);
  const source = lockedContractSource(contractId, version);
  const contract = new Set(contractClauses(source));
  const caseIds = new Set(manifest.cases.map((entry) => entry.id));
  const errors = [];

  if (manifest.contract !== contractId || manifest.contractVersion !== version) errors.push(`Manifest must target ${contractId} contract version ${version}.`);
  if (manifest.status !== 'planned') errors.push('Initial suite manifest must state planned status until execution evidence exists.');

  for (const testCase of manifest.cases) {
    if (!testCase.id || !testCase.category || !testCase.technique) errors.push(`Case is missing required metadata: ${JSON.stringify(testCase)}.`);
    if (!allowedCaseStatuses.has(testCase.status)) errors.push(`Case ${testCase.id} has an invalid status ${testCase.status}.`);
    if (!Array.isArray(testCase.claims) || testCase.claims.length === 0) errors.push(`Case ${testCase.id} has no contract claims.`);
    for (const claim of testCase.claims ?? []) if (!contract.has(claim)) errors.push(`Case ${testCase.id} claims unknown contract clause ${claim}.`);
  }
  if (caseIds.size !== manifest.cases.length) errors.push('Manifest duplicates case identifiers.');

  const matrixClauses = new Set();
  for (const entry of matrix.entries) {
    if (!contract.has(entry.clause)) errors.push(`Matrix references unknown contract clause ${entry.clause}.`);
    if (matrixClauses.has(entry.clause)) errors.push(`Matrix duplicates contract clause ${entry.clause}.`);
    matrixClauses.add(entry.clause);
    if (!caseIds.has(entry.proof)) errors.push(`Matrix proof ${entry.proof} for ${entry.clause} has no manifest case.`);
    const proofCase = manifest.cases.find((candidate) => candidate.id === entry.proof);
    if (manifest.proofClaimsRequired && proofCase && !proofCase.claims.includes(entry.clause)) errors.push(`Matrix proof ${entry.proof} does not claim ${entry.clause}.`);
    if (!allowedCaseStatuses.has(entry.status)) errors.push(`Matrix entry ${entry.clause} has invalid status ${entry.status}.`);
  }
  for (const clause of contract) if (!matrixClauses.has(clause)) errors.push(`Matrix has no entry for contract clause ${clause}.`);
  if (manifest.executableFormat === 'composed-validation-scenario/v1') errors.push(...validateCareerCases(manifest));
  errors.push(...validateStructuredSuite(source, manifest));
  return { errors, caseCount: manifest.cases.length, matrixCount: matrix.entries.length, contractCount: contract.size };
}

export function validateAllSuites() {
  return Object.entries(contractLock().contracts).flatMap(([contractId, versions]) =>
    Object.keys(versions).map((version) => ({ contractId, version, ...validateSuite(contractId, version) })),
  );
}

export function validateProfile(contractId, version = targetVersion(contractId)) {
  const target = lockedContract(contractId, version);
  const profileVersion = target.profileVersion ?? version;
  const profile = readJson(`profiles/${contractId}/${profileVersion}/profile.json`);
  const manifest = suiteManifest(contractId, version);
  const caseIds = new Set(manifest.cases.map((entry) => entry.id));
  const errors = [];

  if (profile.format !== 'composed-validation-profile/v1') errors.push('Profile uses an unsupported format.');
  if (profile.id !== `${contractId}/conformance` || profile.version !== profileVersion) errors.push(`Profile identity must be ${contractId}/conformance@${profileVersion}.`);
  if (profile.contract?.id !== contractId || profile.contract?.version !== version) errors.push(`Profile must target ${contractId}@${version}.`);
  if (profile.contract?.revision !== target.revision) errors.push('Profile contract revision differs from the immutable lock.');
  if (profile.suite !== `${contractId}/${version}`) errors.push(`Profile must reference suite ${contractId}/${version}.`);
  if (profile.adapter?.boundary !== 'black_box') errors.push('Profile must require a black_box adapter boundary.');
  for (const operation of requiredOperations) if (!profile.adapter?.requiredOperations?.includes(operation)) errors.push(`Profile adapter omits required operation ${operation}.`);
  for (const caseId of profile.requiredCases ?? []) if (!caseIds.has(caseId)) errors.push(`Profile requires unknown suite case ${caseId}.`);
  if ((profile.requiredCases ?? []).length === 0) errors.push('Profile must name at least one required suite case.');
  errors.push(...validateStructuredProfile(lockedContractSource(contractId, version), manifest, profile));
  return { errors, profile, requiredCaseCount: profile.requiredCases?.length ?? 0 };
}

export function validateAllProfiles() {
  return Object.entries(contractLock().contracts).flatMap(([contractId, versions]) =>
    Object.keys(versions)
      .filter((version) => existsSync(resolve(repositoryRoot, `profiles/${contractId}/${lockedContract(contractId, version).profileVersion ?? version}/profile.json`)))
      .map((version) => ({ contractId, version, ...validateProfile(contractId, version) })),
  );
}

export function validateAgentOsProfile() {
  return validateProfile('agent-os', '0.2.0');
}

export function validateCollaborativeWorkspaceProfile() {
  return validateProfile('collaborative-workspace', '0.1.0');
}
