/* eslint-disable @typescript-eslint/no-require-imports -- Runs as plain CommonJS before the bundled Next server. */
'use strict';
const { stagingRuntimeMatches } = require('./runtime-policy');
const build = require('../aasr-staging-build.json');
if (!stagingRuntimeMatches(build)) {
  // No configuration values, credentials or connection strings in startup logs.
  process.stderr.write('Staging runtime does not match the reviewed artifact bindings.\n');
  process.exitCode = 1;
} else {
  require('../apps/witnessops-app/server.js');
}
