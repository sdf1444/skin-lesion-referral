import { Injectable } from '@nestjs/common';
import type { ImageInfo, RiskResult, Urgency } from './referral.types';

const TIMEFRAME: Record<Urgency, string> = {
  urgent: 'URGENT (to be seen within 2 weeks)',
  soon: 'EXPEDITED (to be seen within 6 weeks)',
  routine: 'ROUTINE',
};

export interface LetterInput {
  patientName: string;
  patientAge: number;
  site: string;
  referrerName: string;
  notes?: string | null;
}

@Injectable()
export class LetterService {
  generate(
    a: LetterInput,
    r: RiskResult,
    image: ImageInfo,
    date = new Date(),
  ): string {
    const features = r.factors.length
      ? r.factors.map((f) => `  - ${f}`).join('\n')
      : '  - None recorded';
    const lines = [
      `Date: ${date.toISOString().slice(0, 10)}`,
      '',
      'Dear Dermatology Colleague,',
      '',
      `Re: ${a.patientName}, age ${a.patientAge}`,
      `Referral priority: ${TIMEFRAME[r.urgency]}`,
      '',
      `I would be grateful for your assessment of a pigmented skin lesion on the ${a.site}.`,
      '',
      'Features noted:',
      features,
      '',
      `Automated triage score: ${r.score.toFixed(2)} (${r.model}). This is a decision-support aid only and does not replace clinical judgement.`,
      `Image provided: ${image.filename} (${image.mimeType}, ${Math.max(1, Math.round(image.bytes / 1024))} KB).`,
    ];
    if (a.notes) lines.push('', `Additional notes: ${a.notes}`);
    lines.push('', 'Yours sincerely,', a.referrerName);
    return lines.join('\n');
  }
}
