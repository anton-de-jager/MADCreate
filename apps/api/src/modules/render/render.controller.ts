import { Controller, Get, Header, NotFoundException, Param, Query, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { RenderService } from './render.service';

/** Replace characters that are unsafe inside XML text/attribute values. */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Public endpoints consumed by the Angular renderer at /:slug.
// The frontend calls /v1/render/site?slug=... (or relies on hostname middleware).
@ApiTags('render')
@Controller('render')
export class RenderController {
  constructor(
    private readonly render: RenderService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('site')
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
  async site(@Req() req: Request, @Query('slug') slug?: string) {
    if (slug) {
      const site = await this.render.getSiteForSlug(slug);
      if (!site) throw new NotFoundException('Site not found');
      return site;
    }
    const host = (req.header('x-forwarded-host') ?? req.header('host') ?? '').split(':')[0];
    if (!host) throw new NotFoundException('No host');
    const site = await this.render.getSiteForHostname(host);
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  @Public()
  @Get('site/:slug/page/:pageSlug')
  async page(@Param('slug') slug: string, @Param('pageSlug') pageSlug: string) {
    return this.render.getPageBySlug(slug, pageSlug);
  }

  /** Lightweight robots.txt generator per tenant. */
  @Public()
  @Get(':slug/robots.txt')
  @Header('Content-Type', 'text/plain')
  async robots(@Param('slug') slug: string) {
    return `User-agent: *\nAllow: /\nSitemap: https://${this.config.get<string>('web.publicDomain') ?? 'madcreate.madleads.ai'}/${slug}/sitemap.xml\n`;
  }

  /** Lightweight sitemap.xml generator per tenant. */
  @Public()
  @Get(':slug/sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async sitemap(@Param('slug') slug: string) {
    const site = await this.render.getSiteForSlug(slug);
    if (!site) throw new NotFoundException();
    const domain = this.config.get<string>('web.publicDomain') ?? 'madcreate.madleads.ai';
    const base = `https://${domain}/${xmlEscape(slug)}`;
    const urls = site.pages
      .map((p) => `  <url><loc>${base}${p.slug === 'home' ? '' : '/' + xmlEscape(p.slug)}</loc></url>`)
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  }
}
