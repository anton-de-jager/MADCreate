import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { RenderService } from './render.service';
export declare class RenderController {
    private readonly render;
    private readonly config;
    constructor(render: RenderService, config: ConfigService);
    site(req: Request, slug?: string): Promise<import("./render.service").RenderedSite>;
    page(slug: string, pageSlug: string): Promise<{
        site: import("./render.service").RenderedSite;
        page: {
            slug: string;
            title: string;
            metaTitle?: string | null;
            metaDescription?: string | null;
            schema: unknown;
        };
    }>;
    robots(slug: string): Promise<string>;
    sitemap(slug: string): Promise<string>;
}
