import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { PrismaService } from '../../../prisma/prisma.service';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';

// ---------------------------------------------------------------------------
// Types that mirror the JSON stored in Page.schema and Tenant.branding
// ---------------------------------------------------------------------------

interface PageSection {
  kind?: string;
  type?: string;
  props?: Record<string, unknown>;
  [key: string]: unknown;
}

interface PageSchema {
  sections?: PageSection[];
  [key: string]: unknown;
}

interface BrandKit {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  logoUrl?: string;
}

// Writes a fully-rendered static HTML export of every published page to
// ./storage/exports/<tenant>/<version>/.  Each page becomes a standalone
// HTML5 document with proper head, embedded styles derived from the tenant
// brand kit, and semantic section markup generated from the page schema.
@Injectable()
export class StaticExportAdapter implements DeploymentAdapter {
  constructor(private readonly prisma: PrismaService) {}

  async deploy(input: DeploymentInput): Promise<DeploymentResult> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: input.tenantId } });
    const site = input.siteId
      ? await this.prisma.site.findUnique({
          where: { id: input.siteId },
          include: { pages: { where: { deletedAt: null } } },
        })
      : await this.prisma.site.findFirst({
          where: { tenantId: input.tenantId, deletedAt: null },
          include: { pages: { where: { deletedAt: null } } },
          orderBy: { updatedAt: 'desc' },
        });
    if (!tenant || !site) return { log: 'No site' };

    const outDir =
      (input.config?.outputDir as string | undefined) ??
      path.join(process.cwd(), 'storage', 'exports', tenant.slug, String(Date.now()));
    await fs.mkdir(outDir, { recursive: true });

    const brandKit = (tenant.branding ?? {}) as BrandKit;

    for (const page of site.pages) {
      const schema = (page.schema ?? {}) as PageSchema;
      const html = renderPage({
        title: page.metaTitle ?? page.title,
        description: page.metaDescription ?? '',
        ogImageUrl: page.ogImageUrl ?? '',
        siteName: site.name,
        schema,
        brandKit,
      });
      await fs.writeFile(path.join(outDir, `${page.slug || 'index'}.html`), html, 'utf8');
    }

    return { log: `Exported ${site.pages.length} pages to ${outDir}`, artefactUrl: `file://${outDir}` };
  }
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

interface RenderPageOptions {
  title: string;
  description: string;
  ogImageUrl: string;
  siteName: string;
  schema: PageSchema;
  brandKit: BrandKit;
}

export function renderPage(opts: RenderPageOptions): string {
  const { title, description, ogImageUrl, siteName, schema, brandKit } = opts;
  const sections = Array.isArray(schema.sections) ? schema.sections : [];
  const styles = buildStyles(brandKit);
  const bodyContent = sections.length > 0
    ? sections.map(renderSection).join('\n')
    : `<section class="section-placeholder"><p>No content yet.</p></section>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:site_name" content="${esc(siteName)}">
  ${ogImageUrl ? `<meta property="og:image" content="${esc(ogImageUrl)}">` : ''}
  <style>
${styles}
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

function buildStyles(brand: BrandKit): string {
  const primary = brand.primaryColor ?? '#2563eb';
  const secondary = brand.secondaryColor ?? '#64748b';
  const bg = brand.backgroundColor ?? '#ffffff';
  const text = brand.textColor ?? '#111827';
  const font = brand.fontFamily ?? 'system-ui, -apple-system, sans-serif';

  return `    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${font}; background-color: ${bg}; color: ${text}; line-height: 1.6; }
    a { color: ${primary}; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .section-hero { background-color: ${primary}; color: #fff; padding: 80px 24px; text-align: center; }
    .section-hero h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 16px; }
    .section-hero p { font-size: 1.125rem; max-width: 640px; margin: 0 auto 24px; }
    .section-hero .cta-btn { display: inline-block; background: #fff; color: ${primary}; padding: 12px 28px; border-radius: 6px; font-weight: 600; }
    .section-features { padding: 64px 24px; max-width: 1100px; margin: 0 auto; }
    .section-features h2 { font-size: 1.875rem; font-weight: 700; text-align: center; margin-bottom: 40px; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; }
    .feature-item { padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; }
    .feature-item h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 8px; color: ${primary}; }
    .section-text { padding: 64px 24px; max-width: 800px; margin: 0 auto; }
    .section-text h2 { font-size: 1.875rem; font-weight: 700; margin-bottom: 16px; }
    .section-cta { background-color: ${secondary}; color: #fff; padding: 64px 24px; text-align: center; }
    .section-cta h2 { font-size: 1.875rem; font-weight: 700; margin-bottom: 16px; }
    .section-cta .cta-btn { display: inline-block; background: #fff; color: ${secondary}; padding: 12px 28px; border-radius: 6px; font-weight: 600; }
    .section-faq { padding: 64px 24px; max-width: 800px; margin: 0 auto; }
    .section-faq h2 { font-size: 1.875rem; font-weight: 700; margin-bottom: 32px; }
    .faq-item { border-bottom: 1px solid #e5e7eb; padding: 16px 0; }
    .faq-item dt { font-weight: 600; margin-bottom: 8px; }
    .section-generic { padding: 48px 24px; max-width: 900px; margin: 0 auto; }
    .section-placeholder { padding: 48px 24px; text-align: center; color: #6b7280; }`;
}

function renderSection(section: PageSection): string {
  const kind = (section.kind ?? section.type ?? 'generic').toLowerCase();
  const props = section.props ?? {};

  switch (kind) {
    case 'hero':
      return renderHeroSection(props);
    case 'features':
      return renderFeaturesSection(props);
    case 'cta':
      return renderCtaSection(props);
    case 'faq':
      return renderFaqSection(props);
    case 'text':
    case 'content':
      return renderTextSection(props);
    default:
      return renderGenericSection(kind, props);
  }
}

function renderHeroSection(props: Record<string, unknown>): string {
  const heading = esc(String(props['heading'] ?? props['title'] ?? ''));
  const subheading = esc(String(props['subheading'] ?? props['subtitle'] ?? props['description'] ?? ''));
  const ctaLabel = esc(String(props['ctaLabel'] ?? props['buttonText'] ?? props['cta'] ?? ''));
  const ctaUrl = esc(String(props['ctaUrl'] ?? props['buttonUrl'] ?? '#'));

  return `<section class="section-hero">
  ${heading ? `<h1>${heading}</h1>` : ''}
  ${subheading ? `<p>${subheading}</p>` : ''}
  ${ctaLabel ? `<a class="cta-btn" href="${ctaUrl}">${ctaLabel}</a>` : ''}
</section>`;
}

function renderFeaturesSection(props: Record<string, unknown>): string {
  const heading = esc(String(props['heading'] ?? props['title'] ?? 'Features'));
  const items = Array.isArray(props['items']) ? props['items'] as Record<string, unknown>[] : [];

  const featureItems = items
    .map((item) => {
      const name = esc(String((item as Record<string, unknown>)['title'] ?? (item as Record<string, unknown>)['name'] ?? ''));
      const desc = esc(String((item as Record<string, unknown>)['description'] ?? (item as Record<string, unknown>)['body'] ?? ''));
      return `<div class="feature-item"><h3>${name}</h3><p>${desc}</p></div>`;
    })
    .join('\n    ');

  return `<section class="section-features">
  <h2>${heading}</h2>
  <div class="features-grid">
    ${featureItems || '<div class="feature-item"><p>Feature content coming soon.</p></div>'}
  </div>
</section>`;
}

function renderCtaSection(props: Record<string, unknown>): string {
  const heading = esc(String(props['heading'] ?? props['title'] ?? ''));
  const subheading = esc(String(props['subheading'] ?? props['subtitle'] ?? ''));
  const ctaLabel = esc(String(props['ctaLabel'] ?? props['buttonText'] ?? props['cta'] ?? ''));
  const ctaUrl = esc(String(props['ctaUrl'] ?? props['buttonUrl'] ?? '#'));

  return `<section class="section-cta">
  ${heading ? `<h2>${heading}</h2>` : ''}
  ${subheading ? `<p>${subheading}</p>` : ''}
  ${ctaLabel ? `<a class="cta-btn" href="${ctaUrl}">${ctaLabel}</a>` : ''}
</section>`;
}

function renderFaqSection(props: Record<string, unknown>): string {
  const heading = esc(String(props['heading'] ?? props['title'] ?? 'FAQ'));
  const items = Array.isArray(props['items']) ? props['items'] as Record<string, unknown>[] : [];

  const faqItems = items
    .map((item) => {
      const q = esc(String((item as Record<string, unknown>)['question'] ?? (item as Record<string, unknown>)['q'] ?? ''));
      const a = esc(String((item as Record<string, unknown>)['answer'] ?? (item as Record<string, unknown>)['a'] ?? ''));
      return `<div class="faq-item"><dt>${q}</dt><dd>${a}</dd></div>`;
    })
    .join('\n    ');

  return `<section class="section-faq">
  <h2>${heading}</h2>
  <dl>
    ${faqItems || '<div class="faq-item"><dt>Question?</dt><dd>Answer coming soon.</dd></div>'}
  </dl>
</section>`;
}

function renderTextSection(props: Record<string, unknown>): string {
  const heading = esc(String(props['heading'] ?? props['title'] ?? ''));
  const body = esc(String(props['body'] ?? props['content'] ?? props['text'] ?? ''));

  return `<section class="section-text">
  ${heading ? `<h2>${heading}</h2>` : ''}
  ${body ? `<p>${body}</p>` : ''}
</section>`;
}

function renderGenericSection(kind: string, props: Record<string, unknown>): string {
  const heading = esc(String(props['heading'] ?? props['title'] ?? kind));
  const body = esc(String(props['body'] ?? props['content'] ?? props['description'] ?? props['text'] ?? ''));

  return `<section class="section-generic" data-kind="${esc(kind)}">
  ${heading ? `<h2>${heading}</h2>` : ''}
  ${body ? `<p>${body}</p>` : ''}
</section>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
