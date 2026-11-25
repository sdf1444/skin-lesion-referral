import { LetterService } from './letter.service';

describe('LetterService', () => {
  const svc = new LetterService();
  const risk = {
    score: 0.4,
    urgency: 'soon' as const,
    factors: ['Asymmetry'],
    model: 'm1',
  };
  const image = { filename: 'x.png', mimeType: 'image/png', bytes: 2048 };
  const input = {
    patientName: 'Jane Doe',
    patientAge: 55,
    site: 'left forearm',
    referrerName: 'Dr A. Smith',
  };

  it('includes key details', () => {
    const text = svc.generate(
      input,
      risk,
      image,
      new Date('2025-01-02T00:00:00Z'),
    );
    expect(text).toContain('Date: 2025-01-02');
    expect(text).toContain('Jane Doe, age 55');
    expect(text).toContain('EXPEDITED');
    expect(text).toContain('  - Asymmetry');
    expect(text.trimEnd().endsWith('Dr A. Smith')).toBe(true);
  });

  it('omits notes when absent and includes them when present', () => {
    expect(svc.generate(input, risk, image)).not.toContain('Additional notes');
    expect(
      svc.generate({ ...input, notes: 'Grew recently' }, risk, image),
    ).toContain('Additional notes: Grew recently');
  });
});
