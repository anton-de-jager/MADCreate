import { PrismaService } from '../../prisma/prisma.service';
export declare class SiteApplicatorService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    parse(input: string | object): GeneratedSite;
    apply(tenantId: string, spec: GeneratedSite): Promise<{
        siteId: string;
        themeId: string;
        pageCount: number;
    }>;
    private applyOnce;
}
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
        navigation: {
            items: Array<{
                label: string;
                href: string;
            }>;
        };
        settings: Record<string, unknown>;
        pages: Array<{
            slug: string;
            title: string;
            metaTitle?: string;
            metaDescription?: string;
            sections: Array<{
                kind: string;
                props: Record<string, unknown>;
            }>;
        }>;
    };
    integrationNotes?: Array<{
        key: string;
        where: string;
        purpose: string;
    }>;
}
