/**
 * E2E test setup. Runs before each test file.
 *
 * Uses the real MySQL database pointed to by TEST_DATABASE_URL (or DATABASE_URL
 * as fallback for local dev). Tests are responsible for cleaning up their own
 * data — helper utilities are provided below.
 */

// Ensure Prisma picks up the test database URL.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// Disable throttling in tests.
process.env.THROTTLE_DISABLED = 'true';

// Set JWT secret for tests.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'e2e-test-secret-do-not-use-in-production';
}
