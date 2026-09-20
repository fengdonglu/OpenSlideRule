// Circular reading maths: a cursor reads a movable ring at its local position on
// the turned rotor (screen angle minus the rotor offset), and an edited value is
// converted back to the cursor angle by adding the offset again. Fixed rings are
// read at the cursor angle itself. Kept pure so the round-trip is unit-testable.

// Screen angle -> the ring's own local position, wrapped to [0, 1).
export function circularLocalPosition(
  cursorPosition: number,
  discOffset: number,
  isMovable: boolean,
): number {
  return (cursorPosition - (isMovable ? discOffset : 0) + 1) % 1
}

// The ring's own local position -> the screen angle, wrapped to [0, 1).
export function circularCursorPosition(
  localPosition: number,
  discOffset: number,
  isMovable: boolean,
): number {
  return (localPosition + (isMovable ? discOffset : 0) + 1) % 1
}
