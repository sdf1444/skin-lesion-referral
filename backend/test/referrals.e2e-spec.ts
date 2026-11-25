import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { User } from '../src/users/user.entity';
import { UsersService } from '../src/users/users.service';
import type { Role } from '../src/users/roles';

const PASSWORD = 'demo-password-123';
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);
const patient = {
  patientName: 'Jane Doe',
  patientAge: '55',
  site: 'left forearm',
};

describe('Referrals API (e2e, real MySQL)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let users: UsersService;
  let userRepo: Repository<User>;

  const agents: Record<string, request.Agent> = {};

  async function makeUser(role: Role): Promise<string> {
    const email = `${role}-${randomUUID()}@e2e.test`;
    await userRepo.save(
      userRepo.create({
        email,
        name: `E2E ${role}`,
        role,
        passwordHash: await users.hash(PASSWORD),
      }),
    );
    return email;
  }

  async function signIn(email: string): Promise<request.Agent> {
    const agent = request.agent(server);
    await agent
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return agent;
  }

  const create = (
    agent: request.Agent,
    key: string = randomUUID(),
    fields: Record<string, string> = patient,
  ) => {
    let r = agent.post('/api/referrals').set('Idempotency-Key', key);
    for (const [k, v] of Object.entries(fields)) r = r.field(k, v);
    return r.attach('image', png, 'lesion.png');
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    server = app.getHttpServer();
    users = app.get(UsersService);
    userRepo = app.get(getRepositoryToken(User));
    agents.referrer = await signIn(await makeUser('referrer'));
    agents.otherReferrer = await signIn(await makeUser('referrer'));
    agents.specialist = await signIn(await makeUser('specialist'));
    agents.specialist2 = await signIn(await makeUser('specialist'));
    agents.admin = await signIn(await makeUser('admin'));
  });

  afterAll(() => app.close());

  describe('authentication', () => {
    it('keeps health public and everything else private', async () => {
      await request(server).get('/api/health').expect(200);
      await request(server).get('/api/referrals').expect(401);
      await request(server).get('/api/auth/me').expect(401);
    });

    it('rejects bad credentials with the same message for unknown email and wrong password', async () => {
      const a = await request(server)
        .post('/api/auth/login')
        .send({ email: 'nobody@e2e.test', password: 'x' })
        .expect(401);
      const email = await makeUser('referrer');
      const b = await request(server)
        .post('/api/auth/login')
        .send({ email, password: 'wrong' })
        .expect(401);
      expect(a.body.message).toBe(b.body.message);
    });

    it('sets an httpOnly SameSite=Strict cookie and never returns the hash', async () => {
      const email = await makeUser('referrer');
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200);
      const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Strict/i);
      expect(res.body).toEqual({
        id: expect.any(String),
        email,
        name: 'E2E referrer',
        role: 'referrer',
      });
    });

    it('signs out: clears the cookie and invalidates the old token', async () => {
      const email = await makeUser('referrer');
      const login = await request(server)
        .post('/api/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200);
      const oldCookie = (
        login.headers['set-cookie'] as unknown as string[]
      )[0].split(';')[0];
      await request(server)
        .get('/api/auth/me')
        .set('Cookie', oldCookie)
        .expect(200);

      const out = await request(server)
        .post('/api/auth/logout')
        .set('Cookie', oldCookie)
        .expect(204);
      expect((out.headers['set-cookie'] as unknown as string[])[0]).toMatch(
        /access_token=;/,
      );
      await request(server)
        .get('/api/auth/me')
        .set('Cookie', oldCookie)
        .expect(401);
    });

    it('allows sign-out without a session', async () => {
      await request(server).post('/api/auth/logout').expect(204);
    });
  });

  describe('role-based access', () => {
    it('only referrers and admins can create', async () => {
      await create(agents.specialist).expect(403);
      await create(agents.referrer).expect(201);
      await create(agents.admin).expect(201);
    });

    it('records the signed-in user as the referrer, ignoring client input', async () => {
      const res = await create(agents.referrer, randomUUID(), {
        ...patient,
        referrerName: 'Spoofed',
      });
      expect(res.status).toBe(400); // unknown field rejected
      const ok = await create(agents.referrer).expect(201);
      expect(ok.body.referrerName).toBe('E2E referrer');
      expect(ok.body).not.toHaveProperty('idempotencyKey');
      expect(ok.body).not.toHaveProperty('requestHash');
    });

    it('scopes referrers to their own referrals; staff see all', async () => {
      const mine = (await create(agents.referrer).expect(201)).body;
      await agents.referrer.get(`/api/referrals/${mine.id}`).expect(200);
      // Another referrer gets 404, not 403, so existence isn't revealed.
      await agents.otherReferrer.get(`/api/referrals/${mine.id}`).expect(404);
      await agents.otherReferrer
        .patch(`/api/referrals/${mine.id}/status`)
        .send({ status: 'cancelled' })
        .expect(404);
      await agents.specialist.get(`/api/referrals/${mine.id}`).expect(200);
      await agents.admin.get(`/api/referrals/${mine.id}`).expect(200);

      const theirList = (
        await agents.otherReferrer.get('/api/referrals').expect(200)
      ).body as Array<{ id: string }>;
      expect(theirList.some((r) => r.id === mine.id)).toBe(false);
      const staffList = (
        await agents.specialist.get('/api/referrals?limit=100').expect(200)
      ).body as Array<{ id: string }>;
      expect(staffList.some((r) => r.id === mine.id)).toBe(true);
    });

    it('rejects malformed ids and invalid status filters', async () => {
      await agents.referrer.get('/api/referrals/not-a-uuid').expect(400);
      await agents.referrer.get('/api/referrals?status=bogus').expect(400);
    });
  });

  describe('duplicate submissions (idempotency)', () => {
    it('requires a valid Idempotency-Key', async () => {
      await agents.referrer
        .post('/api/referrals')
        .field('patientName', 'A')
        .field('patientAge', '5')
        .field('site', 's')
        .attach('image', png, 'a.png')
        .expect(400);
      await create(agents.referrer, 'short').expect(400);
    });

    it('returns the original referral when the same request is retried', async () => {
      const key = randomUUID();
      const first = await create(agents.referrer, key).expect(201);
      const second = await create(agents.referrer, key).expect(200);
      expect(second.body.id).toBe(first.body.id);
    });

    it('rejects reusing a key with a different payload', async () => {
      const key = randomUUID();
      await create(agents.referrer, key).expect(201);
      await create(agents.referrer, key, {
        ...patient,
        patientName: 'Someone Else',
      }).expect(422);
    });

    it('creates exactly one referral for concurrent identical requests', async () => {
      const key = randomUUID();
      const results = await Promise.all(
        Array.from({ length: 6 }, () => create(agents.referrer, key)),
      );
      expect(results.every((r) => r.status === 200 || r.status === 201)).toBe(
        true,
      );
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
    });

    it('scopes keys per user', async () => {
      const key = randomUUID();
      const a = await create(agents.referrer, key).expect(201);
      const b = await create(agents.otherReferrer, key).expect(201);
      expect(a.body.id).not.toBe(b.body.id);
    });
  });

  describe('status transitions', () => {
    const patch = (agent: request.Agent, id: string, status: string) =>
      agent.patch(`/api/referrals/${id}/status`).send({ status });

    it('walks the happy path and reports allowed transitions per role', async () => {
      const { body } = await create(agents.referrer).expect(201);
      expect(body.status).toBe('submitted');
      expect(body.allowedTransitions).toEqual(['cancelled']);

      const asSpecialist = await agents.specialist
        .get(`/api/referrals/${body.id}`)
        .expect(200);
      expect(asSpecialist.body.allowedTransitions).toEqual(['under_review']);

      await patch(agents.specialist, body.id, 'under_review').expect(200);
      await patch(agents.specialist, body.id, 'accepted').expect(200);
      const done = await patch(agents.specialist, body.id, 'completed').expect(
        200,
      );
      expect(done.body.status).toBe('completed');
      expect(done.body.allowedTransitions).toEqual([]);
    });

    it('rejects skipping steps, going backwards and no-op changes with 409', async () => {
      const { body } = await create(agents.referrer).expect(201);
      await patch(agents.specialist, body.id, 'accepted').expect(409);
      await patch(agents.specialist, body.id, 'submitted').expect(409);
      await patch(agents.specialist, body.id, 'under_review').expect(200);
      await patch(agents.specialist, body.id, 'under_review').expect(409);
      await patch(agents.specialist, body.id, 'submitted').expect(409);
    });

    it('treats rejected, completed and cancelled as final', async () => {
      const a = (await create(agents.referrer).expect(201)).body;
      await patch(agents.specialist, a.id, 'under_review').expect(200);
      await patch(agents.specialist, a.id, 'rejected').expect(200);
      for (const s of ['under_review', 'accepted', 'completed', 'cancelled']) {
        await patch(agents.admin, a.id, s).expect(409);
      }
      const b = (await create(agents.referrer).expect(201)).body;
      await patch(agents.referrer, b.id, 'cancelled').expect(200);
      await patch(agents.specialist, b.id, 'under_review').expect(409);
    });

    it('stops referrers from making clinical decisions or cancelling after acceptance', async () => {
      const { body } = await create(agents.referrer).expect(201);
      await patch(agents.referrer, body.id, 'under_review').expect(409);
      await patch(agents.referrer, body.id, 'accepted').expect(409);
      await patch(agents.specialist, body.id, 'under_review').expect(200);
      await patch(agents.specialist, body.id, 'accepted').expect(200);
      await patch(agents.referrer, body.id, 'cancelled').expect(409);
      await patch(agents.specialist, body.id, 'cancelled').expect(409);
    });

    it('rejects unknown statuses', async () => {
      const { body } = await create(agents.referrer).expect(201);
      await patch(agents.specialist, body.id, 'deleted').expect(400);
    });

    it('lets only one of two conflicting concurrent decisions win', async () => {
      const { body } = await create(agents.referrer).expect(201);
      await patch(agents.specialist, body.id, 'under_review').expect(200);
      const [a, b] = await Promise.all([
        patch(agents.specialist, body.id, 'accepted'),
        patch(agents.specialist2, body.id, 'rejected'),
      ]);
      expect([a.status, b.status].sort()).toEqual([200, 409]);
      const final = await agents.admin
        .get(`/api/referrals/${body.id}`)
        .expect(200);
      expect(final.body.status).toBe(
        a.status === 200 ? 'accepted' : 'rejected',
      );
    });

    it('filters the list by status', async () => {
      const { body } = await create(agents.referrer).expect(201);
      await patch(agents.referrer, body.id, 'cancelled').expect(200);
      const res = await agents.referrer
        .get('/api/referrals?status=cancelled&limit=100')
        .expect(200);
      expect(
        (res.body as Array<{ status: string }>).every(
          (r) => r.status === 'cancelled',
        ),
      ).toBe(true);
      expect(
        (res.body as Array<{ id: string }>).some((r) => r.id === body.id),
      ).toBe(true);
    });
  });
});
