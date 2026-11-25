# Skin Lesion Referral

Upload a lesion photo with clinician-entered ABCDE features; get a triage score, urgency and a draft referral letter. Referrals are stored in MySQL.

**Not a clinical tool.** Scoring is a rule-based heuristic ([scoring.service.ts](backend/src/referrals/scoring.service.ts)). Swap in a validated image classifier behind that service.

## Stack

- `frontend/`: React + Vite + TypeScript (Vitest, Testing Library)
- `backend/`: NestJS + TypeORM + MySQL (class-validator, helmet, rate limiting)
- Docker Compose for local run

## Run with Docker

```
cp .env.example .env     # set DB_PASSWORD
docker compose up --build
```
App at http://localhost:8080.

## Run for development

```
# MySQL: docker compose up db   (publishes 127.0.0.1:3306)
cd backend  && cp .env.example .env && npm install && npm run start:dev   # :3000
cd frontend && npm install && npm run dev                                 # :5173, proxies /api
```

## Tests

```
cd backend  && npm test && npm run test:e2e   # e2e uses an in-memory repository, no DB needed
cd frontend && npm test
```

## API (prefix `/api`)

- `POST /referrals` multipart: `image` (JPEG/PNG, ≤ 8 MB, validated by content), `patientName`, `patientAge`, `site`, `referrerName`, optional `notes`, boolean flags `asymmetry`, `borderIrregular`, `colourVariation`, `diameterOver6mm`, `evolving`, `bleedingOrUlcerated`, `familyHistoryMelanoma`. Returns the stored referral including `score`, `urgency`, `letter`.
- `GET /referrals?limit=` and `GET /referrals/:id`
- `GET /health`

## Before real patient data

Images are processed in memory and not stored. There is no authentication/authorisation, no audit logging and no migrations (`DB_SYNCHRONIZE` is for local use). Patient-identifiable data is stored in MySQL: add auth, encryption at rest, migrations and a compliance review first. Terraform/AWS and Kubernetes are not included.
