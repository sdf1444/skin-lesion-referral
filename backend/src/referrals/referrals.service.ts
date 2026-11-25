import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReferralDto } from './dto/create-referral.dto';
import type { ValidatedImage } from './image-validation.pipe';
import { LetterService } from './letter.service';
import { Referral } from './referral.entity';
import type { Features } from './referral.types';
import { ScoringService } from './scoring.service';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral) private readonly repo: Repository<Referral>,
    private readonly scoring: ScoringService,
    private readonly letters: LetterService,
  ) {}

  async create(
    dto: CreateReferralDto,
    image: ValidatedImage,
  ): Promise<Referral> {
    const features: Features = {
      asymmetry: dto.asymmetry,
      borderIrregular: dto.borderIrregular,
      colourVariation: dto.colourVariation,
      diameterOver6mm: dto.diameterOver6mm,
      evolving: dto.evolving,
      bleedingOrUlcerated: dto.bleedingOrUlcerated,
      familyHistoryMelanoma: dto.familyHistoryMelanoma,
    };
    const risk = this.scoring.score(features, dto.patientAge);
    const letter = this.letters.generate(dto, risk, image);
    return this.repo.save(
      this.repo.create({
        patientName: dto.patientName,
        patientAge: dto.patientAge,
        site: dto.site,
        referrerName: dto.referrerName,
        notes: dto.notes ?? null,
        features,
        ...risk,
        imageFilename: image.filename,
        imageMimeType: image.mimeType,
        imageBytes: image.bytes,
        letter,
      }),
    );
  }

  async findOne(id: string): Promise<Referral> {
    const referral = await this.repo.findOne({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');
    return referral;
  }

  findRecent(limit = 20): Promise<Referral[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
    });
  }
}
