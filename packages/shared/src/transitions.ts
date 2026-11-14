import { ComplaintStatus } from './enums';

/**
 * Allowed state transitions for the complaint lifecycle (design.md §8).
 * CLOSED and LINKED_DUPLICATE are terminal — they have no outgoing transitions.
 */
export const TRANSITIONS: Readonly<
  Record<ComplaintStatus, readonly ComplaintStatus[]>
> = {
  [ComplaintStatus.SUBMITTED]: [ComplaintStatus.ANALYZING],
  [ComplaintStatus.ANALYZING]: [
    ComplaintStatus.NEEDS_REVIEW,
    ComplaintStatus.ROUTED,
    ComplaintStatus.LINKED_DUPLICATE,
  ],
  [ComplaintStatus.NEEDS_REVIEW]: [
    ComplaintStatus.ROUTED,
    ComplaintStatus.LINKED_DUPLICATE,
  ],
  [ComplaintStatus.ROUTED]: [ComplaintStatus.ASSIGNED],
  [ComplaintStatus.ASSIGNED]: [ComplaintStatus.IN_PROGRESS],
  [ComplaintStatus.IN_PROGRESS]: [ComplaintStatus.RESOLVED],
  [ComplaintStatus.RESOLVED]: [
    ComplaintStatus.CLOSED,
    ComplaintStatus.REOPENED,
  ],
  [ComplaintStatus.REOPENED]: [ComplaintStatus.ASSIGNED],
  // Terminal states — no transitions out
  [ComplaintStatus.CLOSED]: [],
  [ComplaintStatus.LINKED_DUPLICATE]: [],
} as const;

/** Returns true when transitioning from `from` to `to` is valid. */
export function canTransition(
  from: ComplaintStatus,
  to: ComplaintStatus,
): boolean {
  const allowed = TRANSITIONS[from];
  return allowed !== undefined && (allowed as readonly string[]).includes(to);
}

/** All statuses that represent an open (non-terminal) complaint. */
export const OPEN_STATUSES: readonly ComplaintStatus[] = Object.values(
  ComplaintStatus,
).filter(
  (s) => s !== ComplaintStatus.CLOSED && s !== ComplaintStatus.LINKED_DUPLICATE,
);
