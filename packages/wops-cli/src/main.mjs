#!/usr/bin/env node
import { run } from './commands.mjs';
import { serverCheck } from './server-check.mjs';
try { process.exitCode = await (process.argv[2] === 'server' ? serverCheck : run)(process.argv.slice(2)); }
catch (error) { console.error(error.message); process.exitCode = 1; }
