const http = require('node:http');
const { createRequire } = require('node:module');
const { PrismaClient } = require('@prisma/client');
const apiRequire = createRequire(`${process.cwd()}/apps/api/package.json`);
const argon2 = apiRequire('argon2');

const prisma = new PrismaClient();
const port = Number(process.env.API_PORT || 4213);
const host = process.env.API_HOST || '127.0.0.1';
const origins = new Set([
  'http://localhost:3013',
  'http://127.0.0.1:3013',
  'https://madcreate.madprospects.com',
]);

function send(res, status, body, origin) {
  if (origin && origins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(status);
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    isSuperAdmin: user.isSuperAdmin,
    emailVerified: !!user.emailVerifiedAt,
  };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (req.method === 'OPTIONS') return send(res, 204, {}, origin);
  if (req.method === 'GET' && req.url === '/v1/health') {
    return send(res, 200, { ok: true, data: { status: 'ok' } }, origin);
  }
  if (req.method === 'POST' && req.url === '/v1/auth/login') {
    try {
      const dto = await readJson(req);
      const user = await prisma.user.findFirst({
        where: { email: String(dto.email || '').toLowerCase(), deletedAt: null },
      });
      if (!user || !user.passwordHash || !(await argon2.verify(user.passwordHash, String(dto.password || '')))) {
        return send(res, 401, { ok: false, error: { message: 'Invalid credentials' } }, origin);
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), lastLoginIp: req.socket.remoteAddress },
      });
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: user.id, status: 'ACTIVE' },
        include: { workspace: { select: { id: true, slug: true, name: true } } },
      });
      return send(res, 200, {
        ok: true,
        data: {
          user: publicUser(user),
          tokens: {
            accessToken: `dev-access-${user.id}`,
            refreshToken: `dev-refresh-${user.id}`,
          },
          memberships: memberships.map((m) => ({
            workspaceId: m.workspaceId,
            workspaceName: m.workspace.name,
            workspaceSlug: m.workspace.slug,
            role: m.role,
          })),
          currentWorkspaceId: memberships[0]?.workspaceId,
        },
      }, origin);
    } catch (err) {
      return send(res, 500, { ok: false, error: { message: err.message } }, origin);
    }
  }
  return send(res, 404, { ok: false, error: { message: 'Not found' } }, origin);
});

server.listen(port, host, () => {
  console.log(`dev auth server listening on http://${host}:${port}/v1`);
});
