import { PrismaService } from '../../../prisma/prisma.service';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';
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
export declare class StaticExportAdapter implements DeploymentAdapter {
    private readonly prisma;
    constructor(prisma: PrismaService);
    deploy(input: DeploymentInput): Promise<DeploymentResult>;
}
interface RenderPageOptions {
    title: string;
    description: string;
    ogImageUrl: string;
    siteName: string;
    schema: PageSchema;
    brandKit: BrandKit;
}
export declare function renderPage(opts: RenderPageOptions): string;
export {};
