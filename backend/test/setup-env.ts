// Runs before the e2e suite loads the app. Requires a reachable MySQL (see README).
process.env.NODE_ENV = 'test';
process.env.DB_HOST ??= 'localhost';
process.env.DB_PASSWORD ??= 'change-me';
process.env.DB_SYNCHRONIZE = 'true';
process.env.JWT_SECRET = 'e2e-test-secret-e2e-test-secret-e2e-test';
process.env.SEED_DEMO_USERS = 'true';
process.env.DEMO_PASSWORD = 'demo-password-123';
