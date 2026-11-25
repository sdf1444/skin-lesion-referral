import { Injectable } from '@nestjs/common';
import type { Features, RiskResult, Urgency } from './referral.types';

const WEIGHTS: Array<[keyof Features, number, string]> = [
  ['evolving', 0.3, 'Evolving / changing lesion'],
  ['bleedingOrUlcerated', 0.2, 'Bleeding or ulceration'],
  ['colourVariation', 0.15, 'Colour variation'],
  ['borderIrregular', 0.12, 'Irregular border'],
  ['asymmetry', 0.1, 'Asymmetry'],
  ['diameterOver6mm', 0.1, 'Diameter over 6mm'],
  ['familyHistoryMelanoma', 0.08, 'Family history of melanoma'],
];

/**
 * Rule-based ABCDE heuristic. A stand-in, NOT a validated clinical model;
 * replace with a trained image classifier behind this service.
 */
@Injectable()
export class ScoringService {
  score(features: Features, age: number): RiskResult {
    const hits = WEIGHTS.filter(([key]) => features[key]);
    let raw = hits.reduce((sum, [, w]) => sum + w, 0);
    if (age >= 50) raw += 0.05;
    const score = Math.min(1, Math.round(raw * 100) / 100);
    return {
      score,
      urgency: this.urgency(score, features),
      factors: hits.map(([, , l]) => l),
      model: 'heuristic-abcde-v1',
    };
  }

  private urgency(score: number, f: Features): Urgency {
    if (score >= 0.5 || (f.evolving && f.bleedingOrUlcerated)) return 'urgent';
    if (score >= 0.25) return 'soon';
    return 'routine';
  }
}
