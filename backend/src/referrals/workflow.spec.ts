import {
  allowedTransitions,
  isTerminal,
  STATUSES,
  type Status,
} from './workflow';

describe('workflow', () => {
  it('lets specialists review, decide and complete', () => {
    expect(allowedTransitions('submitted', 'specialist', false)).toEqual([
      'under_review',
    ]);
    expect(allowedTransitions('under_review', 'specialist', false)).toEqual([
      'accepted',
      'rejected',
    ]);
    expect(allowedTransitions('accepted', 'specialist', false)).toEqual([
      'completed',
    ]);
  });

  it('lets only the owning referrer cancel, and only before a decision', () => {
    expect(allowedTransitions('submitted', 'referrer', true)).toEqual([
      'cancelled',
    ]);
    expect(allowedTransitions('under_review', 'referrer', true)).toEqual([
      'cancelled',
    ]);
    expect(allowedTransitions('accepted', 'referrer', true)).toEqual([]);
    expect(allowedTransitions('submitted', 'referrer', false)).toEqual([]);
  });

  it('does not let specialists cancel', () => {
    expect(allowedTransitions('submitted', 'specialist', false)).not.toContain(
      'cancelled',
    );
  });

  it.each(['rejected', 'completed', 'cancelled'] as Status[])(
    '%s is terminal for every role',
    (status) => {
      expect(isTerminal(status)).toBe(true);
      for (const role of ['referrer', 'specialist', 'admin'] as const) {
        expect(allowedTransitions(status, role, true)).toEqual([]);
      }
    },
  );

  it('never allows a status to transition to itself', () => {
    for (const s of STATUSES) {
      for (const role of ['referrer', 'specialist', 'admin'] as const) {
        expect(allowedTransitions(s, role, true)).not.toContain(s);
      }
    }
  });
});
