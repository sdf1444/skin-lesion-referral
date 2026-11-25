export type Urgency = 'urgent' | 'soon' | 'routine'

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

export interface Referral {
  id: string
  patientName: string
  patientAge: number
  site: string
  score: number
  urgency: Urgency
  factors: string[]
  model: string
  letter: string
  createdAt: string
}
