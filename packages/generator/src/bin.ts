#!/usr/bin/env node
// Real Node entry point. Kept thin so the parsing logic stays testable in cli.ts.
// Exits with the code returned by runCli; 0 success, 1 invalid spec, 2 bad input.

import { readFileSync, writeFileSync } from 'node:fs'
import { runCli } from './cli'
import type { CliIO } from './cli'

const io: CliIO = {
  readFile: (path) => readFileSync(path, 'utf8'),
  writeFile: (path, data) => writeFileSync(path, data),
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
}

process.exitCode = runCli(process.argv.slice(2), io)
