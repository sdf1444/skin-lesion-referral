import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { QueryFailedError, Repository } from 'typeorm';
import type { AuthUser } from '../users/roles';
import { CreateReferralDto } from './dto/create-referral.dto';
import type { ValidatedImage } from './image-validation.pipe';
import { LetterService } from './letter.service';
import { Referral } from './referral.entity';
import type { Features } from './referral.types';
import { ScoringService } from './scoring.service';
import { allowedTransitions, type Status } from './workflow';

export interface ReferralView extends Omit<
  Referral,
  'idempotencyKey' | 'requestHash' | 'createdBy'
> {
  allowedTransitions: Status[];
}

const MYSQL_DUP_ENTRY = 1062;

function fingerprint(dto: CreateReferralDto, image: ValidatedImage): string {
  const imageHash = createHash('sha256').update(image.buffer).digest('hex');
  return createHash('sha256')
    .update(JSON.stringify({ dto, imageHash }))
    .digest('hex');
}

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral) private readonly repo: Repository<Referral>,
    private readonly scoring: ScoringService,
    private readonly letters: LetterService,
  ) {}

  toView(r: Referral, user: AuthUser): ReferralView {
    // Strip internals explicitly rather than spreading the entity.
    const rest: Partial<Referral> = { ...r };
    delete rest.idempotencyKey;
    delete rest.requestHash;
    delete rest.createdBy;
    return {
      ...(rest as Omit<
        Referral,
        'idempotencyKey' | 'requestHash' | 'createdBy'
      >),
      allowedTransitions: allowedTransitions(
        r.status,
        user.role,
        r.createdById === user.id,
      ),
    };
  }

  /** Referrers are scoped to their own referrals; specialists and admins see everything. */
  private scope(user: AuthUser): { createdById?: string } {
    return user.role === 'referrer' ? { createdById: user.id } : {};
  }

  /** `created` is false when an earlier request with the same idempotency key is replayed. */
  async create(
    dto: CreateReferralDto,
    image: ValidatedImage,
    user: AuthUser,
    idempotencyKey: string,
  ): Promise<{ referral: Referral; created: boolean }> {
    const requestHash = fingerprint(dto, image);
    const existing = await this.findByKey(user.id, idempotencyKey, requestHash);
    if (existing) return { referral: existing, created: false };

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
    const letter = this.letters.generate(
      { ...dto, referrerName: user.name },
      risk,
      image,
    );
    try {
      const referral = await this.repo.save(
        this.repo.create({
          patientName: dto.patientName,
          patientAge: dto.patientAge,
          site: dto.site,
          referrerName: user.name,
          notes: dto.notes ?? null,
          features,
          ...risk,
          imageFilename: image.filename,
          imageMimeType: image.mimeType,
          imageBytes: image.bytes,
          letter,
          createdById: user.id,
          idempotencyKey,
          requestHash,
        }),
      );
      return { referral, created: true };
    } catch (err) {
      // A concurrent request with the same key won the race; return its result.
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { errno?: number })?.errno === MYSQL_DUP_ENTRY
      ) {
        const winner = await this.findByKey(
          user.id,
          idempotencyKey,
          requestHash,
        );
        if (winner) return { referral: winner, created: false };
      }
      throw err;
    }
  }

  private async findByKey(
    userId: string,
    key: string,
    requestHash: string,
  ): Promise<Referral | null> {
    const found = await this.repo.findOne({
      where: { createdById: userId, idempotencyKey: key },
    });
    if (found && found.requestHash !== requestHash) {
      throw new UnprocessableEntityException(
        'Idempotency-Key was already used with a different request',
      );
    }
    return found;
  }

  async findOne(id: string, user: AuthUser): Promise<Referral> {
    // Out-of-scope referrals look identical to missing ones so existence isn't leaked.
    const referral = await this.repo.findOne({
      where: { id, ...this.scope(user) },
    });
    if (!referral) throw new NotFoundException('Referral not found');
    return referral;
  }

  findAll(
    user: AuthUser,
    opts: { status?: Status; limit?: number } = {},
  ): Promise<Referral[]> {
    return this.repo.find({
      where: {
        ...this.scope(user),
        ...(opts.status ? { status: opts.status } : {}),
      },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(opts.limit ?? 50, 1), 100),
    });
  }

  async transition(id: string, to: Status, user: AuthUser): Promise<Referral> {
    const referral = await this.findOne(id, user);
    const allowed = allowedTransitions(
      referral.status,
      user.role,
      referral.createdById === user.id,
    );
    if (!allowed.includes(to)) {
      throw new ConflictException(
        `Cannot change status from '${referral.status}' to '${to}'` +
          (allowed.length
            ? `. Allowed: ${allowed.join(', ')}`
            : ' (no further changes are possible for you)'),
      );
    }
    // Compare-and-set: if another request changed the status since we read it, nothing is updated.
    const result = await this.repo.update(
      { id, status: referral.status },
      { status: to, statusUpdatedAt: new Date() },
    );
    if (!result.affected)
      throw new ConflictException(
        'Referral was updated by someone else; reload and try again',
      );
    return this.findOne(id, user);
  }
}
