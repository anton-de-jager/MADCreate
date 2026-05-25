import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PageStatus, Prisma, SiteStatus } from '@prisma/client';

/**
 * Takes a validated AI-generated site spec (the JSON Claude Code produced)
 * and materializes it as Theme + Site + Pages + Sections for a tenant.
 * Idempotent: re-running replaces the tenant's site contents.
 */
@Injectable()
export class SiteApplicatorService {
  private readonly logger = new Logger(SiteApplicatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse a JSON string OR an object. Strips a ```json fence if present so
   * tenants can paste the full Claude Code response verbatim. Throws
   * BadRequestException with a readable message on any failure.
   */
  parse(input: string | object): GeneratedSite {
    let obj: unknown;
    if (typeof input === 'string') {
      const cleaned = stripJsonFence(input.trim());
      try {
        obj = JSON.parse(cleaned);
      } catch (err) {
        throw new BadRequestException(
          `Pasted text isn't valid JSON: ${(err as Error).message}. Make sure to copy only the JSON object from Claude Code, including the outer braces.`,
        );
      }
    } else {
      obj = input;
    }
    return validate(obj);
  }

  /**
   * Apply a validated site spec to a tenant. Wraps everything in a single
   * transaction so a half-applied site never persists. Pages are created
   * in parallel and sections go through createMany so the transaction stays
   * well under the default Prisma timeout. We also bump the timeout to 30s
   * for safety against MySQL latency spikes on the managed DB.
   *
   * Retries once on P1017 (server-closed-the-connection) — DreamHost's
   * managed MySQL has an aggressive wait_timeout and Prisma's pool can hand
   * out a stale connection.
   */
  async apply(tenantId: string, spec: GeneratedSite) {
    try {
      return await this.applyOnce(tenantId, spec);
    } catch (err: unknown) {
      const code =
        err instanceof Error && 'code' in err
          ? (err as Record<string, unknown>).code
          : err != null && typeof err === 'object' && 'errorCode' in err
            ? (err as Record<string, unknown>).errorCode
            : undefined;
      const msg  = err instanceof Error ? err.message : String(err);
      if (code === 'P1017' || /closed the connection/i.test(msg)) {
        this.logger.warn('Applicator hit P1017; reconnecting + retrying once.');
        await this.prisma.$disconnect();
        await this.prisma.$connect();
        return await this.applyOnce(tenantId, spec);
      }
      throw err;
    }
  }

  private async applyOnce(tenantId: string, spec: GeneratedSite) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Tenant.branding so the dashboard knows what the AI proposed.
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          branding: {
            colors: spec.brandKit.colors,
            typography: spec.brandKit.typography,
            voice: spec.brandKit.voice,
            tagline: spec.brandKit.tagline,
            mission: spec.brandKit.mission,
            logoConcept: spec.brandKit.logoConcept,
          } as Prisma.InputJsonValue,
        },
      });

      // 2. New active Theme; older themes flipped to isActive=false.
      await tx.theme.updateMany({ where: { tenantId, isActive: true }, data: { isActive: false } });
      const theme = await tx.theme.create({
        data: {
          tenantId,
          name: spec.brandKit.name ?? 'AI Generated',
          isActive: true,
          tokens: {
            colors:     spec.brandKit.colors,
            typography: spec.brandKit.typography,
            voice:      spec.brandKit.voice,
            radius:  { sm: '6px', md: '8px', lg: '12px', xl: '20px' },
            spacing: { tight: '0.5rem', base: '1rem', loose: '2rem' },
          } as Prisma.InputJsonValue,
        },
      });

      // 3. Soft-delete any existing site(s) for this tenant.
      await tx.site.updateMany({
        where: { tenantId, deletedAt: null },
        data: { deletedAt: new Date(), status: SiteStatus.DRAFT },
      });

      // 4. New Site, PUBLISHED.
      const site = await tx.site.create({
        data: {
          tenantId,
          name: spec.site.name,
          themeId: theme.id,
          status: SiteStatus.PUBLISHED,
          version: 1,
          publishedAt: new Date(),
          navigation: spec.site.navigation as unknown as Prisma.InputJsonValue,
          settings:   spec.site.settings as unknown as Prisma.InputJsonValue,
        },
      });

      // 5. Pages — created in parallel. The renderer reads Page.schema
      //    directly (sections array + meta).
      const createdPages = await Promise.all(spec.site.pages.map((p, i) =>
        tx.page.create({
          data: {
            tenantId,
            siteId: site.id,
            slug: p.slug,
            title: p.title,
            metaTitle:       p.metaTitle ?? p.title,
            metaDescription: p.metaDescription,
            status: PageStatus.PUBLISHED,
            order: i,
            publishedAt: new Date(),
            schema: {
              sections: p.sections,
              meta: { title: p.metaTitle ?? p.title, description: p.metaDescription },
            } as Prisma.InputJsonValue,
          },
        }),
      ));

      // 6. Sections in one createMany — used by the visual builder, not the
      //    renderer. relationMode='prisma' means Prisma doesn't enforce FKs
      //    on the DB side, so this is just a bulk insert.
      const sectionRows = createdPages.flatMap((page, pi) =>
        spec.site.pages[pi].sections.map((s, j) => ({
          tenantId,
          pageId: page.id,
          kind: s.kind,
          order: j,
          props: s.props as unknown as Prisma.InputJsonValue,
        })),
      );
      if (sectionRows.length) {
        await tx.section.createMany({ data: sectionRows });
      }

      return { siteId: site.id, themeId: theme.id, pageCount: createdPages.length };
    }, { timeout: 30_000, maxWait: 5_000 });
  }
}

// --------- types + validator ----------------------------------------

export interface GeneratedSite {
  brandKit: {
    name: string;
    tagline: string;
    mission: string;
    voice: string;
    logoConcept: string;
    colors: Record<string, string>;
    typography: {
      headingFamily: string;
      bodyFamily: string;
      headingWeights: number[];
      bodyWeights: number[];
    };
  };
  site: {
    name: string;
    navigation: { items: Array<{ label: string; href: string }> };
    settings: Record<string, unknown>;
    pages: Array<{
      slug: string;
      title: string;
      metaTitle?: string;
      metaDescription?: string;
      sections: Array<{ kind: string; props: Record<string, unknown> }>;
    }>;
  };
  integrationNotes?: Array<{ key: string; where: string; purpose: string }>;
}

function stripJsonFence(text: string): string {
  // Accepts: ```json {...} ``` | ``` {...} ``` | raw JSON
  const fence = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (fence) return fence[1].trim();
  return text;
}

function validate(obj: unknown): GeneratedSite {
  if (!obj || typeof obj !== 'object') throw new BadRequestException('Site spec must be a JSON object.');
  const o = obj as Record<string, unknown>;

  if (!o.brandKit || typeof o.brandKit !== 'object') throw new BadRequestException('Missing "brandKit" object.');
  if (!o.site     || typeof o.site     !== 'object') throw new BadRequestException('Missing "site" object.');

  const bk = o.brandKit as Record<string, unknown>;
  for (const k of ['name', 'tagline', 'mission', 'voice', 'logoConcept']) {
    if (typeof bk[k] !== 'string') throw new BadRequestException(`brandKit.${k} must be a string.`);
  }
  if (!bk.colors || typeof bk.colors !== 'object') throw new BadRequestException('brandKit.colors must be an object.');
  if (!bk.typography || typeof bk.typography !== 'object') throw new BadRequestException('brandKit.typography must be an object.');

  const s = o.site as Record<string, unknown>;
  if (typeof s.name !== 'string') throw new BadRequestException('site.name must be a string.');
  const nav = s.navigation as Record<string, unknown> | undefined;
  if (!nav?.items || !Array.isArray(nav.items)) throw new BadRequestException('site.navigation.items must be an array.');
  if (!s.settings || typeof s.settings !== 'object') throw new BadRequestException('site.settings must be an object.');
  if (!Array.isArray(s.pages) || (s.pages as unknown[]).length === 0) throw new BadRequestException('site.pages must be a non-empty array.');

  for (const p of s.pages as Array<Record<string, unknown>>) {
    if (typeof p.slug !== 'string')  throw new BadRequestException('Each page needs a string slug.');
    if (typeof p.title !== 'string') throw new BadRequestException(`Page "${p.slug}" needs a title.`);
    if (!Array.isArray(p.sections))  throw new BadRequestException(`Page "${p.slug}" needs a sections array.`);
    for (const sec of p.sections as Array<Record<string, unknown>>) {
      if (typeof sec.kind !== 'string') throw new BadRequestException(`A section on "${p.slug}" is missing kind.`);
      if (!sec.props || typeof sec.props !== 'object') throw new BadRequestException(`A section on "${p.slug}" is missing props.`);
    }
  }

  return o as unknown as GeneratedSite;
}
