import { validateAllContractLocks } from './lib.mjs';

const results = validateAllContractLocks();
const errors = results.flatMap((result) => result.errors.map((error) => `${result.contractId}@${result.version}: ${error}`));
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  for (const result of results) console.log(`Validated ${result.metadata.id}@${result.metadata.version} at ${result.actualRevision}; ${result.clauses.length} contract clauses discovered (including acceptance).`);
}
