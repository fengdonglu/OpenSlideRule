// Node-agnostic command line entry point.
// All filesystem and stream access goes through CliIO so the parser can be
// tested in memory; bin.ts supplies the real node:fs / process implementation.
// Exit codes are the contract: 0 success, 1 the spec was built but invalid,
// 2 the invocation or input could not be processed at all.

import { buildRule } from './build'
import type { RuleSpec } from './spec'

export interface CliIO {
  readFile(path: string): string
  writeFile(path: string, data: string): void
  stdout(text: string): void
  stderr(text: string): void
}

const USAGE = 'Usage: slide-rule-gen build <spec.json> -o <out.json>\n'

export function runCli(argv: string[], io: CliIO): number {
  const [command, ...args] = argv
  if (command !== 'build') {
    io.stderr(USAGE)
    return 2
  }

  let specPath: string | undefined
  let outPath: string | undefined
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '-o' || arg === '--out') {
      const value = args[i + 1]
      if (value === undefined) {
        io.stderr(USAGE)
        return 2
      }
      outPath = value
      i += 1
    } else if (arg.startsWith('-')) {
      io.stderr(USAGE)
      return 2
    } else if (specPath === undefined) {
      specPath = arg
    } else {
      io.stderr(USAGE)
      return 2
    }
  }

  if (specPath === undefined || outPath === undefined) {
    io.stderr(USAGE)
    return 2
  }

  let text: string
  try {
    text = io.readFile(specPath)
  } catch {
    io.stderr(`error: cannot read '${specPath}'\n`)
    return 2
  }

  let spec: RuleSpec
  try {
    spec = JSON.parse(text) as RuleSpec
  } catch {
    io.stderr(`error: '${specPath}' is not valid JSON\n`)
    return 2
  }

  const result = buildRule(spec)
  if (!result.ok) {
    for (const error of result.errors) {
      io.stderr(`${error.path}: ${error.message}\n`)
    }
    return 1
  }

  try {
    io.writeFile(outPath, `${JSON.stringify(result.rule, null, 2)}\n`)
  } catch {
    io.stderr(`error: cannot write '${outPath}'\n`)
    return 2
  }

  io.stdout(`Wrote ${outPath} (rule '${result.rule.id}')\n`)
  return 0
}
