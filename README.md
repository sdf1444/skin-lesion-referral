# Skin Lesion Referral

A clinician signs in, uploads a lesion photo with ABCDE features, and gets a triage score, urgency and a draft referral letter. Referrals are stored in MySQL and move through a role-controlled workflow.

**Not a clinical tool.** Scoring is a rule-based heuristic ([scoring.service.ts](backend/src/referrals/scoring.service.ts)). Swap in a validated image classifier behind that service.

See the [User Guide](USER_GUIDE.md) for sign-in, role permissions, referral creation, status changes, and safe use guidance.

## Stack

- `frontend/`: React + Vite + TypeScript + React Router (Vitest, Testing Library)
- `backend/`: NestJS + TypeORM + MySQL (JWT cookie auth, class-validator, helmet, rate limiting)
- Docker Compose for local run

## Run with Docker

```
cp .env.example .env     # set DB_PASSWORD, JWT_SECRET (32+ chars), DEMO_PASSWORD
docker compose up --build
```

App at http://localhost:8080. With `SEED_DEMO_USERS=true` these accounts are created (password = `DEMO_PASSWORD`):

| Email | Role |
| --- | --- |
| referrer@example.com | referrer |
| specialist@example.com | specialist |
| admin@example.com | admin |

Demo seeding is refused when `NODE_ENV=production`.

## Run for development

```
# MySQL: docker compose up db   (publishes 127.0.0.1:3306)
cd backend  && cp .env.example .env && npm install && npm run start:dev   # :3000
cd frontend && npm install && npm run dev                                 # :5173, proxies /api
```

## Tests

```
cd backend  && npm test            # unit tests
cd backend  && npm run test:e2e    # needs MySQL (docker compose up db); uses DB_PASSWORD
cd frontend && npm test
```

## Auth and roles

- `POST /api/auth/login` sets an httpOnly, SameSite=Strict JWT cookie. `POST /api/auth/logout` clears it and revokes all of that user's tokens (`tokenVersion`). `GET /api/auth/me` returns the current user. Login is rate limited (5/min).
- The UI redirects unauthenticated users to `/login`, and **Sign out** returns to `/login`. Any 401 also drops the session in the UI.

| Role | Can do |
| --- | --- |
| referrer | Create referrals; see only their own; cancel their own before a decision |
| specialist | See all referrals; review, accept, reject, complete |
| admin | Everything |

Referrals outside a user's scope return 404 (not 403) so their existence is not leaked.

## Workflow

```
submitted -> under_review -> accepted -> completed
     |            |-> rejected
     |            |-> cancelled
     |-> cancelled
```

`rejected`, `completed` and `cancelled` are terminal. Transitions are defined once in [workflow.ts](backend/src/referrals/workflow.ts), validated server-side (invalid -> 409) and applied with a compare-and-set update, so two concurrent decisions cannot both win. The API returns `allowedTransitions` per referral for the current user and the UI renders only those buttons.

## Duplicate submissions

`POST /api/referrals` requires an `Idempotency-Key` header (8-64 chars of `A-Za-z0-9_-`), unique per user.

- Same key + same payload: the original referral is returned (200, not 201); nothing is created twice, including concurrent requests.
- Same key + different payload: 422.

The UI generates one key per form payload and regenerates it when the form changes.

## API (prefix `/api`)

- `POST /referrals` multipart: `image` (JPEG/PNG, up to 8 MB, validated by content), `patientName`, `patientAge`, `site`, optional `notes`, boolean flags `asymmetry`, `borderIrregular`, `colourVariation`, `diameterOver6mm`, `evolving`, `bleedingOrUlcerated`, `familyHistoryMelanoma`. Referrer name comes from the signed-in user.
- `GET /referrals?status=&limit=`, `GET /referrals/:id`, `PATCH /referrals/:id/status` with `{ "status": "..." }`
- `GET /health`

## Limitations

- No user-management endpoints or password reset; users are seeded or inserted directly.
- No status-history/audit table.
- Images are processed in memory and not stored.
- No migrations (`DB_SYNCHRONIZE` is for local use).
- Before real patient data: encryption at rest, audit logging, migrations and a compliance review. Terraform/AWS and Kubernetes are not included.
