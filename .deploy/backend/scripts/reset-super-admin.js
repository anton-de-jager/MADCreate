#!/usr/bin/env node
// Emergency recovery: reset a super-admin user's password directly via Prisma.
// Ships with every deploy at <API_REMOTE_PATH>/scripts/reset-super-admin.js.
//
// Usage:
//   node scripts/reset-super-admin.js <email> <new-password>
//
// Or via env vars (avoids the password landing in shell history):
//   RESET_EMAIL=admin@madcreate.local RESET_PASSWORD='...' node scripts/reset-super-admin.js
//
// Also sets isSuperAdmin = true and clears deletedAt so a soft-deleted owner
// account can be recovered. Will create the user if they don't exist.

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const email    = (process.argv[2] || process.env.RESET_EMAIL || '').toLowerCase().trim();
const password = process.argv[3] || process.env.RESET_PASSWORD || '';

if (!email || !password) {
  console.error('Usage: node scripts/reset-super-admin.js <email> <new-password>');
  console.error('   or: RESET_EMAIL=... RESET_PASSWORD=... node scripts/reset-super-admin.js');
  process.exit(1);
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const passwordHash = await argon2.hash(password);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, isSuperAdmin: true, deletedAt: null, emailVerifiedAt: new Date() },
      });
      console.log(`[ok] Reset password and ensured super-admin for existing user ${email} (id=${existing.id}).`);
    } else {
      const created = await prisma.user.create({
        data: { email, passwordHash, isSuperAdmin: true, emailVerifiedAt: new Date() },
      });
      console.log(`[ok] Created super-admin user ${email} (id=${created.id}).`);
    }
    // Revoke all refresh tokens so any pre-existing sessions can't keep using the old password.
    const revoked = await prisma.refreshToken.updateMany({
      where: { user: { email }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count > 0) console.log(`[ok] Revoked ${revoked.count} active refresh token(s).`);
  } catch (err) {
    console.error('[fail]', err.message);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
