import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { configureApp } from '../src/configure-app';
import { LetterService } from '../src/referrals/letter.service';
import { Referral } from '../src/referrals/referral.entity';
import { ReferralsController } from '../src/referrals/referrals.controller';
import { ReferralsService } from '../src/referrals/referrals.service';
import { ScoringService } from '../src/referrals/scoring.service';

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);
const base = {
  patientName: 'Jane Doe',
  patientAge: '55',
  site: 'left forearm',
  referrerName: 'Dr A. Smith',
};

describe('Referrals API (e2e, in-memory repository)', () => {
  let app: INestApplication;
  const store = new Map<string, Referral>();

  beforeAll(async () => {
    const repo = {
      create: (x: Partial<Referral>) => x,
      save: async (x: Partial<Referral>) => {
        const saved = {
          ...x,
          id: '11111111-1111-4111-8111-111111111111',
          createdAt: new Date(),
        } as Referral;
        store.set(saved.id, saved);
        return saved;
      },
      findOne: async ({ where }: { where: { id: string } }) =>
        store.get(where.id) ?? null,
      find: async () => [...store.values()],
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [ReferralsController],
      providers: [
        ReferralsService,
        ScoringService,
        LetterService,
        { provide: getRepositoryToken(Referral), useValue: repo },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  const post = (
    fields: Record<string, string>,
    file: Buffer | null = png,
    name = 'lesion.png',
  ) => {
    let r = request(app.getHttpServer()).post('/api/referrals');
    for (const [k, v] of Object.entries(fields)) r = r.field(k, v);
    return file ? r.attach('image', file, name) : r;
  };

  it('creates a referral with score and letter', async () => {
    const res = await post({
      ...base,
      evolving: 'true',
      bleedingOrUlcerated: 'true',
    }).expect(201);
    expect(res.body.urgency).toBe('urgent');
    expect(res.body.letter).toContain('Jane Doe');
    expect(res.body.features.evolving).toBe(true);
  });

  it('fetches a stored referral and 404s on unknown ids', async () => {
    await request(app.getHttpServer())
      .get('/api/referrals/11111111-1111-4111-8111-111111111111')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/referrals/22222222-2222-4222-8222-222222222222')
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/referrals/not-a-uuid')
      .expect(400);
  });

  it('rejects missing image, bad content, invalid fields and unknown fields', async () => {
    await post(base, null).expect(400);
    await post(base, Buffer.from('not an image'), 'evil.png').expect(415);
    await post({ ...base, patientAge: 'abc' }).expect(400);
    await post({ ...base, isAdmin: 'true' }).expect(400);
  });

  it('rejects oversized images', async () => {
    await post(
      base,
      Buffer.concat([png, Buffer.alloc(9 * 1024 * 1024)]),
    ).expect(413);
  });
});
