// Minimal ambient declarations for the handful of Node built-ins the CLI uses.
// The generator tsconfig sets "types": [], so without these the Node-only bin
// would not type-check; only the surface actually used is declared.

declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string
  export function writeFileSync(path: string, data: string): void
}

interface ProcessLike {
  argv: string[]
  exitCode?: number
  stdout: { write(text: string): void }
  stderr: { write(text: string): void }
}

declare const process: ProcessLike
