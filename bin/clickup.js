#!/usr/bin/env node

import { runCli } from '../src/index.mjs';

const exitCode = await runCli({
  argv: process.argv.slice(2),
  env: process.env,
  fetchImpl: globalThis.fetch,
  stdout: process.stdout,
  stderr: process.stderr,
});

process.exitCode = exitCode;
