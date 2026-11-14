import { describe, it, expect } from 'vitest';
import { canTransition, TRANSITIONS, OPEN_STATUSES } from '../src/transitions.js';
import { ComplaintStatus } from '../src/enums.js';

describe('canTransition', () => {
  it('allows SUBMITTED -> ANALYZING', () => {
    expect(canTransition(ComplaintStatus.SUBMITTED, ComplaintStatus.ANALYZING)).toBe(true);
  });

  it('allows ANALYZING -> NEEDS_REVIEW', () => {
    expect(canTransition(ComplaintStatus.ANALYZING, ComplaintStatus.NEEDS_REVIEW)).toBe(true);
  });

  it('allows ANALYZING -> ROUTED', () => {
    expect(canTransition(ComplaintStatus.ANALYZING, ComplaintStatus.ROUTED)).toBe(true);
  });

  it('allows ANALYZING -> LINKED_DUPLICATE', () => {
    expect(canTransition(ComplaintStatus.ANALYZING, ComplaintStatus.LINKED_DUPLICATE)).toBe(true);
  });

  it('allows NEEDS_REVIEW -> ROUTED', () => {
    expect(canTransition(ComplaintStatus.NEEDS_REVIEW, ComplaintStatus.ROUTED)).toBe(true);
  });

  it('allows NEEDS_REVIEW -> LINKED_DUPLICATE', () => {
    expect(canTransition(ComplaintStatus.NEEDS_REVIEW, ComplaintStatus.LINKED_DUPLICATE)).toBe(true);
  });

  it('allows ROUTED -> ASSIGNED', () => {
    expect(canTransition(ComplaintStatus.ROUTED, ComplaintStatus.ASSIGNED)).toBe(true);
  });

  it('allows ASSIGNED -> IN_PROGRESS', () => {
    expect(canTransition(ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS)).toBe(true);
  });

  it('allows IN_PROGRESS -> RESOLVED', () => {
    expect(canTransition(ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED)).toBe(true);
  });

  it('allows RESOLVED -> CLOSED', () => {
    expect(canTransition(ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED)).toBe(true);
  });

  it('allows RESOLVED -> REOPENED', () => {
    expect(canTransition(ComplaintStatus.RESOLVED, ComplaintStatus.REOPENED)).toBe(true);
  });

  it('allows REOPENED -> ASSIGNED', () => {
    expect(canTransition(ComplaintStatus.REOPENED, ComplaintStatus.ASSIGNED)).toBe(true);
  });

  it('rejects SUBMITTED -> ROUTED (must go through ANALYZING)', () => {
    expect(canTransition(ComplaintStatus.SUBMITTED, ComplaintStatus.ROUTED)).toBe(false);
  });

  it('rejects CLOSED -> anything (terminal)', () => {
    for (const status of Object.values(ComplaintStatus)) {
      expect(canTransition(ComplaintStatus.CLOSED, status)).toBe(false);
    }
  });

  it('rejects LINKED_DUPLICATE -> anything (terminal)', () => {
    for (const status of Object.values(ComplaintStatus)) {
      expect(canTransition(ComplaintStatus.LINKED_DUPLICATE, status)).toBe(false);
    }
  });

  it('rejects ASSIGNED -> RESOLVED (must go through IN_PROGRESS)', () => {
    expect(canTransition(ComplaintStatus.ASSIGNED, ComplaintStatus.RESOLVED)).toBe(false);
  });

  it('rejects backward transition ROUTED -> ANALYZING', () => {
    expect(canTransition(ComplaintStatus.ROUTED, ComplaintStatus.ANALYZING)).toBe(false);
  });
});

describe('TRANSITIONS coverage', () => {
  it('covers every status as a key', () => {
    for (const status of Object.values(ComplaintStatus)) {
      expect(TRANSITIONS).toHaveProperty(status);
    }
  });
});

describe('OPEN_STATUSES', () => {
  it('excludes CLOSED and LINKED_DUPLICATE', () => {
    expect(OPEN_STATUSES).not.toContain(ComplaintStatus.CLOSED);
    expect(OPEN_STATUSES).not.toContain(ComplaintStatus.LINKED_DUPLICATE);
  });

  it('includes all other statuses', () => {
    const expected = Object.values(ComplaintStatus).filter(
      (s) => s !== ComplaintStatus.CLOSED && s !== ComplaintStatus.LINKED_DUPLICATE,
    );
    expect(OPEN_STATUSES).toEqual(expect.arrayContaining(expected));
    expect(OPEN_STATUSES.length).toBe(expected.length);
  });
});
