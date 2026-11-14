import { lintToolSchemas } from '../src/tool-schema-lint.mjs';

const problems = lintToolSchemas();
if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}
console.log(`mcp tool schemas ok (${problems.length} problems)`);
