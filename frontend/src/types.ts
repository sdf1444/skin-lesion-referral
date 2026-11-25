export type Urgency = 'urgent' | 'soon' | 'routine'
export type Role = 'referrer' | 'specialist' | 'admin'
export type Status = 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'completed' | 'cancelled'

export const FEATURES = [
  ['asymmetry', 'Asymmetry'],
  ['borderIrregular', 'Irregular border'],
  ['colourVariation', 'Colour variation'],
  ['diameterOver6mm', 'Diameter over 6mm'],
  ['evolving', 'Evolving'],
  ['bleedingOrUlcerated', 'Bleeding / ulcerated'],
  ['familyHistoryMelanoma', 'Family history of melanoma'],
] as const

export type FeatureKey = (typeof FEATURES)[number][0]

export interface User {
  id: string
  email: string
  name: string
  role: Role
}

export interface Referral {
  id: string
  status: Status
  statusUpdatedAt: string
  patientName: string
  patientAge: number
  site: string
  referrerName: string
  score: number
  urgency: Urgency
  factors: string[]
  model: string
  letter: string
  createdAt: string
  allowedTransitions: Status[]
}

export const STATUS_LABELS: Record<Status, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
