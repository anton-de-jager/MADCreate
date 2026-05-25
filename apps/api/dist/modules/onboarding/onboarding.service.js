"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenants_service_1 = require("../tenants/tenants.service");
const ai_service_1 = require("../ai/ai.service");
let OnboardingService = class OnboardingService {
    prisma;
    tenants;
    ai;
    constructor(prisma, tenants, ai) {
        this.prisma = prisma;
        this.tenants = tenants;
        this.ai = ai;
    }
    async saveAnswers(userId, tenantId, answers) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                onboarding: answers,
                name: answers.companyName ?? undefined,
                industry: answers.industry,
                description: answers.description,
                branding: {
                    colors: answers.brandColors ?? [],
                    voice: answers.brandVoice,
                },
            },
        });
    }
    async getAnswers(userId, tenantId) {
        const tenant = await this.tenants.get(userId, tenantId);
        return (tenant.onboarding ?? {});
    }
    async generateFromAnswers(userId, tenantId) {
        const tenant = await this.tenants.get(userId, tenantId);
        const answers = (tenant.onboarding ?? {});
        const integrationKeys = answers.integrations ?? [];
        const integrations = integrationKeys.length
            ? await this.prisma.integrationCatalog.findMany({
                where: { key: { in: integrationKeys } },
                select: { key: true, name: true, category: true, description: true },
            })
            : [];
        const context = renderContext(tenant.name, tenant.slug, answers, integrations);
        const gen = await this.ai.enqueue(userId, tenantId, {
            kind: 'SITE',
            provider: 'claude-code-manual',
            jsonMode: true,
            userPrompt: context,
            variables: answers,
        });
        await this.prisma.claudeTask.create({
            data: {
                title: `Generate site for ${tenant.slug}`,
                priority: 1,
                description: [
                    `Auto-enqueued by the onboarding wizard. End-user is waiting on the /<slug> redirect.`,
                    ``,
                    `**This is a site-generation task (not a code-fix task).** Do NOT git commit. Do NOT deploy. Just generate the JSON and POST it back.`,
                    ``,
                    `**Tenant:** ${tenant.name} (slug: ${tenant.slug}, id: ${tenant.id})`,
                    `**AIGeneration ID:** ${gen.id}`,
                    ``,
                    `### Steps`,
                    ``,
                    `1. Fetch the generation row:`,
                    `     curl -sk -H "X-Worker-Token: \${WORKER_TOKEN}" https://madcreateapi.madleads.ai/v1/ai/generations/${gen.id}`,
                    `   The \`rawOutput\` field IS the Claude Code prompt. It already embeds the tenant's full onboarding context.`,
                    ``,
                    `2. **Wait for status to be AWAITING_INPUT** (the BullMQ processor takes ~1–5s to produce rawOutput). Poll up to 30s.`,
                    ``,
                    `3. Read \`rawOutput\` and mentally generate the JSON site spec it describes (brandKit + site.navigation + site.settings + site.pages[].sections[]). Follow the schema in the prompt exactly. Use the section kinds listed (hero | features | pricing | testimonials | stats | faq | cta | contact | generic).`,
                    ``,
                    `4. POST the JSON back:`,
                    `     curl -sk -X POST -H "Content-Type: application/json" -H "X-Worker-Token: \${WORKER_TOKEN}" \\`,
                    `       https://madcreateapi.madleads.ai/v1/ai/generations/${gen.id}/submit \\`,
                    `       -d '{"raw":"<the JSON, escaped>"}'`,
                    `   The submit endpoint validates against the SiteApplicator schema and creates the Theme + Site + Pages + Sections for the tenant.`,
                    ``,
                    `5. Verify the response is { ok: true, data: { siteId, themeId, pageCount } }. If 4xx, the JSON didn't match the schema — fix it and retry.`,
                    ``,
                    `### Hard rules`,
                    `- No Lorem ipsum. Use real, on-brand copy.`,
                    `- Real Google Font names (Inter, Manrope, Sora, Plus Jakarta Sans, etc).`,
                    `- Every page must have ≥ 2 sections. Home page MUST start with a hero.`,
                    `- navigation.items[].href values must match the page slugs, prefixed with /. Home page is /.`,
                    `- If the tenant picked integrations, include realistic \`integrationNotes\` showing where each integration plugs in.`,
                ].join('\n'),
            },
        });
        return gen;
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenants_service_1.TenantsService,
        ai_service_1.AiService])
], OnboardingService);
function renderContext(tenantName, tenantSlug, a, integrations) {
    const lines = [];
    lines.push(`Business name: ${a.companyName ?? tenantName}`);
    lines.push(`Tenant slug (use for /href values): /${tenantSlug}`);
    if (a.slogan)
        lines.push(`Tagline (from tenant): ${a.slogan}`);
    if (a.industry)
        lines.push(`Industry: ${a.industry}`);
    if (a.description)
        lines.push(`Description: ${a.description}`);
    if (a.targetAudience)
        lines.push(`Target audience: ${a.targetAudience}`);
    if (a.locale)
        lines.push(`Locale: ${a.locale}`);
    if (a.currency)
        lines.push(`Currency: ${a.currency}`);
    if (a.competitors?.length)
        lines.push(`Competitor inspiration: ${a.competitors.join(', ')}`);
    if (a.goals?.length)
        lines.push(`Goals: ${a.goals.join(', ')}`);
    lines.push('');
    lines.push('Brand identity preferences:');
    if (a.brandMood)
        lines.push(`  Mood: ${a.brandMood}`);
    if (a.colorPreference)
        lines.push(`  Color preference: ${a.colorPreference}`);
    if (a.mode)
        lines.push(`  Mode: ${a.mode}`);
    if (a.visualStyle)
        lines.push(`  Visual style: ${a.visualStyle}`);
    if (a.brandVoice)
        lines.push(`  Brand voice: ${a.brandVoice}`);
    if (a.voiceKeywords?.length)
        lines.push(`  Voice keywords: ${a.voiceKeywords.join(', ')}`);
    if (a.hasLogo != null)
        lines.push(`  Has existing logo: ${a.hasLogo ? 'yes (tenant will upload)' : 'no — propose one'}`);
    lines.push('');
    lines.push('Site structure:');
    if (a.layout)
        lines.push(`  Layout preference: ${a.layout}`);
    if (a.pages?.length)
        lines.push(`  Pages: ${a.pages.join(', ')}`);
    if (a.workflows?.length)
        lines.push(`  Workflows: ${a.workflows.join(', ')}`);
    if (integrations.length) {
        lines.push('');
        lines.push('Integrations selected by the tenant (weave them into the site copy where it makes sense):');
        for (const i of integrations) {
            lines.push(`  - ${i.name} (${i.key}, ${i.category}): ${i.description ?? ''}`);
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=onboarding.service.js.map