export type Urgency = 'urgent' | 'soon' | 'routine';

export interface Features {
  asymmetry: boolean;
  borderIrregular: boolean;
  colourVariation: boolean;
  diameterOver6mm: boolean;
  evolving: boolean;
  bleedingOrUlcerated: boolean;
  familyHistoryMelanoma: boolean;
}

export interface RiskResult {
  score: number;
  urgency: Urgency;
  factors: string[];
  model: string;
}

export interface ImageInfo {
  filename: string;
  mimeType: string;
  bytes: number;
}
