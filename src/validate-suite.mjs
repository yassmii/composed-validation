import { validateAllSuites } from './lib.mjs';

const results = validateAllSuites();
const errors = results.flatMap((result) => result.errors.map((error) => `${result.contractId}@${result.version}: ${error}`));
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  for (const result of results) {
    console.log(`Validated ${result.contractId} ${result.version} suite: ${result.caseCount} cases, ${result.matrixCount}/${result.contractCount} matrix clauses.`);
  }
}
