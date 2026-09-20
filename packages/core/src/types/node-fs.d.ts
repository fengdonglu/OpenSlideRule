// Minimal ambient types for the Node builtin used by the graduation-report
// generator test. The app itself is browser-only, so the full @types/node is
// not a dependency; this declares just what that test needs.
declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void
}
