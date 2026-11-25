import { ScoringService } from './scoring.service';

const none = {
  asymmetry: false,
  borderIrregular: false,
  colourVariation: false,
  diameterOver6mm: false,
  evolving: false,
  bleedingOrUlcerated: false,
  familyHistoryMelanoma: false,
};

describe('ScoringService', () => {
  const svc = new ScoringService();

  it('is routine with no features', () => {
    expect(svc.score(none, 30)).toMatchObject({
      score: 0,
      urgency: 'routine',
      factors: [],
    });
  });

  it('adds an age uplift from 50', () => {
    expect(svc.score(none, 50).score).toBe(0.05);
  });

  it('is soon at the 0.25 threshold', () => {
    expect(
      svc.score({ ...none, colourVariation: true, asymmetry: true }, 30)
        .urgency,
    ).toBe('soon');
  });

  it('escalates evolving + bleeding to urgent', () => {
    expect(
      svc.score({ ...none, evolving: true, bleedingOrUlcerated: true }, 20)
        .urgency,
    ).toBe('urgent');
  });

  it('caps the score at 1', () => {
    const all = Object.fromEntries(
      Object.keys(none).map((k) => [k, true]),
    ) as typeof none;
    const r = svc.score(all, 80);
    expect(r.score).toBe(1);
    expect(r.factors).toHaveLength(7);
  });
});
