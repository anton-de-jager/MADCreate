/**
 * E2E test for the AI paste-back flow:
 *   1. Create user + workspace + tenant
 *   2. Enqueue a manual AI generation
 *   3. POST /v1/ai/generations/:id/submit with a fixture site spec
 *   4. Assert Theme + Site + Pages + Sections are created
 *   5. Clean up
 */
import './setup-e2e';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthModule } from '../src/modules/auth/auth.module';
import { AiModule } from '../src/modules/ai/ai.module';
import { TenantsModule } from '../src/modules/tenants/tenants.module';
import { WorkspacesModule } from '../src/modules/workspaces/workspaces.module';
import { UsersModule } from '../src/modules/users/users.module';
import { configuration } from '../src/config/configuration';
import { QueueModule } from '../src/queue/queue.module';
import { RedisModule } from '../src/redis/redis.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

/** Subset of AIGeneration fields returned by GET /v1/ai/generations/:id */
interface GenerationResponse {
  id: string;
  status: string;
  tenantId: string;
  kind: string;
  provider: string;
  model: string;
  input: unknown;
  output: unknown | null;
  rawOutput: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  costUsd: string | null;
  durationMs: number | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const VALID_SITE_SPEC = {
  brandKit: {
    name: 'E2E Test Brand',
    tagline: 'Testing paste-back.',
    mission: 'Validate the apply() branch end-to-end.',
    voice: 'technical, concise',
    logoConcept: 'A simple checkmark.',
    colors: {
      primary: '#7C5CFF',
      secondary: '#0EA5E9',
      accent: '#F472B6',
      background: '#0B0B12',
      surface: '#13131C',
      foreground: '#FAFAFA',
      muted: '#9CA3AF',
    },
    typography: {
      headingFamily: 'Inter',
      bodyFamily: 'Inter',
      headingWeights: [600, 800],
      bodyWeights: [400, 500],
    },
  },
  site: {
    name: 'E2E Test Site',
    navigation: { items: [{ label: 'Home', href: '/' }, { label: 'About', href: '/about' }] },
    settings: { metaTitle: 'E2E Site', metaDescription: 'A site for testing.' },
    pages: [
      {
        slug: 'home',
        title: 'Home',
        metaTitle: 'Home — E2E',
        metaDescription: 'Welcome to the e2e test site.',
        sections: [
          { kind: 'hero', props: { headline: 'Welcome', subheadline: 'Testing.' } },
          { kind: 'features', props: { items: [{ title: 'Fast', description: 'Very fast.' }] } },
        ],
      },
      {
        slug: 'about',
        title: 'About',
        metaTitle: 'About — E2E',
        metaDescription: 'About the e2e test site.',
        sections: [
          { kind: 'generic', props: { content: 'About us content.' } },
        ],
      },
    ],
  },
};

describe('AI Paste-Back Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // IDs created during the test — cleaned up in afterAll.
  let userId: string;
  let workspaceId: string;
  let tenantId: string;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration], cache: true }),
        ThrottlerModule.forRoot([{ name: 'short', ttl: 60_000, limit: 1000 }]),
        PrismaModule,
        RedisModule,
        QueueModule,
        AuthModule,
        UsersModule,
        WorkspacesModule,
        TenantsModule,
        AiModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    jwtService = moduleFixture.get(JwtService);

    // Seed: user → workspace → membership → tenant
    const user = await prisma.user.create({
      data: {
        email: `e2e-paste-back-${Date.now()}@test.local`,
        passwordHash: 'not-a-real-hash',
        name: 'E2E Tester',
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: 'E2E Workspace',
        slug: `e2e-ws-${Date.now()}`,
        ownerId: userId,
      },
    });
    workspaceId = workspace.id;

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId,
        role: 'WORKSPACE_OWNER',
        status: 'ACTIVE',
      },
    });

    const tenant = await prisma.tenant.create({
      data: {
        workspaceId,
        name: 'E2E Tenant',
        slug: `e2e-tenant-${Date.now()}`,
      },
    });
    tenantId = tenant.id;

    // Mint a JWT for authenticated requests.
    accessToken = await jwtService.signAsync({
      sub: userId,
      email: user.email,
      wsid: workspaceId,
      role: 'WORKSPACE_OWNER',
    });
  });

  afterAll(async () => {
    // Clean up in reverse dependency order.
    if (tenantId) {
      await prisma.section.deleteMany({ where: { tenantId } });
      await prisma.page.deleteMany({ where: { tenantId } });
      await prisma.site.deleteMany({ where: { tenantId } });
      await prisma.theme.deleteMany({ where: { tenantId } });
      await prisma.aIGeneration.deleteMany({ where: { tenantId } });
      await prisma.tenant.delete({ where: { id: tenantId } });
    }
    if (workspaceId) {
      await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
      await prisma.workspace.delete({ where: { id: workspaceId } });
    }
    if (userId) {
      await prisma.refreshToken.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await app?.close();
  });

  it('should enqueue a manual generation then accept a submit and create Theme+Site+Pages+Sections', async () => {
    // 1. Enqueue a manual AI generation.
    const enqueueRes = await request(app.getHttpServer())
      .post('/v1/ai/generate')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ tenantId })
      .send({ kind: 'SITE' })
      .expect(201);

    const generationId = enqueueRes.body.data.id;
    expect(generationId).toBeDefined();

    // 2. Wait for AWAITING_INPUT (the BullMQ processor runs the manual provider).
    let generation: GenerationResponse | undefined;
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await request(app.getHttpServer())
        .get(`/v1/ai/generations/${generationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      generation = res.body.data;
      if (generation!.status === 'AWAITING_INPUT') break;
    }
    expect(generation!.status).toBe('AWAITING_INPUT');

    // 3. Submit the site spec (paste-back).
    const submitRes = await request(app.getHttpServer())
      .post(`/v1/ai/generations/${generationId}/submit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ raw: VALID_SITE_SPEC })
      .expect(201);

    const result = submitRes.body.data;
    expect(result.siteId).toBeDefined();
    expect(result.themeId).toBeDefined();
    expect(result.pageCount).toBe(2);

    // 4. Verify DB state.
    const theme = await prisma.theme.findFirst({ where: { tenantId, isActive: true } });
    expect(theme).toBeTruthy();
    expect(theme!.name).toBe('E2E Test Brand');

    const site = await prisma.site.findFirst({ where: { tenantId, deletedAt: null } });
    expect(site).toBeTruthy();
    expect(site!.name).toBe('E2E Test Site');
    expect(site!.status).toBe('PUBLISHED');

    const pages = await prisma.page.findMany({ where: { siteId: site!.id }, orderBy: { order: 'asc' } });
    expect(pages).toHaveLength(2);
    expect(pages[0].slug).toBe('home');
    expect(pages[1].slug).toBe('about');

    const sections = await prisma.section.findMany({ where: { tenantId }, orderBy: { order: 'asc' } });
    expect(sections.length).toBe(3); // 2 on home + 1 on about
    expect(sections.map((s) => s.kind)).toEqual(expect.arrayContaining(['hero', 'features', 'generic']));

    // 5. Verify generation is now SUCCESS.
    const finalGen = await prisma.aIGeneration.findUnique({ where: { id: generationId } });
    expect(finalGen!.status).toBe('SUCCESS');
  });
});
