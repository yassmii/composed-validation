import { validateAllProfiles } from './lib.mjs';

const results = validateAllProfiles();
const errors = results.flatMap((result) => result.errors.map((error) => `${result.contractId}@${result.version}: ${error}`));
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  for (const result of results) console.log(`Validated ${result.profile.id}@${result.profile.version}: ${result.requiredCaseCount} required cases and a black-box adapter boundary.`);
}
