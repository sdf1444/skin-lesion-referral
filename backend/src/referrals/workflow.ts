import type { Role } from '../users/roles';

export const STATUSES = [
  'submitted',
  'under_review',
  'accepted',
  'rejected',
  'completed',
  'cancelled',
] as const;
export type Status = (typeof STATUSES)[number];

interface Rule {
  to: Status;
  // Roles allowed to make this move. 'referrer' only applies to the referral's owner.
  roles: Role[];
}

/**
 * The single source of truth for the referral lifecycle:
 *
 *   submitted -> under_review -> accepted -> completed
 *        \            \-> rejected
 *         \-> cancelled <-/   (cancel allowed before a decision)
 */
const TRANSITIONS: Record<Status, Rule[]> = {
  submitted: [
    { to: 'under_review', roles: ['specialist', 'admin'] },
    { to: 'cancelled', roles: ['referrer', 'admin'] },
  ],
  under_review: [
    { to: 'accepted', roles: ['specialist', 'admin'] },
    { to: 'rejected', roles: ['specialist', 'admin'] },
    { to: 'cancelled', roles: ['referrer', 'admin'] },
  ],
  accepted: [{ to: 'completed', roles: ['specialist', 'admin'] }],
  rejected: [],
  completed: [],
  cancelled: [],
};

export function allowedTransitions(
  from: Status,
  role: Role,
  isOwner: boolean,
): Status[] {
  return TRANSITIONS[from]
    .filter(
      (rule) => rule.roles.includes(role) && (role !== 'referrer' || isOwner),
    )
    .map((rule) => rule.to);
}

export function isTerminal(status: Status): boolean {
  return TRANSITIONS[status].length === 0;
}
