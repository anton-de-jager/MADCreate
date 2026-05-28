from __future__ import annotations

from pathlib import Path
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT_USER = ROOT / "MADCreateUserManual.pdf"
OUT_IDEAS = ROOT / "MADCreateIdeas.pdf"

PAGE_W, PAGE_H = LETTER
MARGIN_X = 0.72 * inch
MARGIN_TOP = 0.78 * inch
MARGIN_BOTTOM = 0.68 * inch
CONTENT_W = PAGE_W - (MARGIN_X * 2)


PALETTE = {
    "ink": colors.HexColor("#111827"),
    "muted": colors.HexColor("#4B5563"),
    "light": colors.HexColor("#F8FAFC"),
    "line": colors.HexColor("#D7DEE8"),
    "teal": colors.HexColor("#0F766E"),
    "lime": colors.HexColor("#65A30D"),
    "orange": colors.HexColor("#EA580C"),
    "blue": colors.HexColor("#2563EB"),
    "purple": colors.HexColor("#7C3AED"),
    "dark": colors.HexColor("#0B1120"),
}


def make_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "TitleCustom",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=29,
            leading=34,
            textColor=PALETTE["dark"],
            alignment=TA_LEFT,
            spaceAfter=10,
        ),
        "subtitle": ParagraphStyle(
            "SubtitleCustom",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=12.5,
            leading=17,
            textColor=PALETTE["muted"],
            spaceAfter=16,
        ),
        "h1": ParagraphStyle(
            "H1Custom",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=PALETTE["teal"],
            spaceBefore=18,
            spaceAfter=8,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "H2Custom",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13.5,
            leading=17,
            textColor=PALETTE["dark"],
            spaceBefore=12,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "H3Custom",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=14,
            textColor=PALETTE["purple"],
            spaceBefore=8,
            spaceAfter=4,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "BodyCustom",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.6,
            leading=13.2,
            textColor=PALETTE["ink"],
            spaceAfter=5.5,
        ),
        "small": ParagraphStyle(
            "SmallCustom",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.2,
            leading=10.5,
            textColor=PALETTE["muted"],
            spaceAfter=4,
        ),
        "label": ParagraphStyle(
            "LabelCustom",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8.2,
            leading=10.5,
            textColor=PALETTE["teal"],
            spaceAfter=3,
        ),
        "cell": ParagraphStyle(
            "CellCustom",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10.3,
            textColor=PALETTE["ink"],
        ),
        "cell_bold": ParagraphStyle(
            "CellBoldCustom",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10.3,
            textColor=PALETTE["dark"],
        ),
        "cover_kicker": ParagraphStyle(
            "CoverKicker",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=colors.white,
            alignment=TA_CENTER,
        ),
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=34,
            leading=39,
            textColor=colors.white,
            alignment=TA_CENTER,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=13,
            leading=18,
            textColor=colors.HexColor("#D8F3EF"),
            alignment=TA_CENTER,
        ),
    }


STYLES = make_styles()


def para(text: str, style: str = "body") -> Paragraph:
    return Paragraph(text, STYLES[style])


def bullets(items: Iterable[str], level: int = 0):
    return ListFlowable(
        [ListItem(para(item), leftIndent=0) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=18 + level * 12,
        bulletFontName="Helvetica",
        bulletFontSize=7,
        bulletOffsetY=1,
    )


def numbered(items: Iterable[str]):
    return ListFlowable(
        [ListItem(para(item), leftIndent=0) for item in items],
        bulletType="1",
        leftIndent=22,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=8,
    )


def table(rows: list[list[str]], widths: list[float] | None = None, header: bool = True) -> Table:
    widths = widths or [CONTENT_W / len(rows[0])] * len(rows[0])
    data = [[para(cell, "cell_bold" if header and r == 0 else "cell") for cell in row] for r, row in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.35, PALETTE["line"]),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FBFCFE")]),
    ]
    if header:
        style.extend(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF7F5")),
                ("TEXTCOLOR", (0, 0), (-1, 0), PALETTE["dark"]),
            ]
        )
    t.setStyle(TableStyle(style))
    return t


def callout(title: str, body: str, tone: str = "teal") -> Table:
    fill = {
        "teal": colors.HexColor("#ECFDF5"),
        "blue": colors.HexColor("#EFF6FF"),
        "orange": colors.HexColor("#FFF7ED"),
        "purple": colors.HexColor("#F5F3FF"),
    }.get(tone, colors.HexColor("#F8FAFC"))
    data = [[para(title, "cell_bold")], [para(body, "cell")]]
    t = Table(data, colWidths=[CONTENT_W], hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), fill),
                ("BOX", (0, 0), (-1, -1), 0.7, PALETTE["line"]),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return t


class MadDoc(BaseDocTemplate):
    def __init__(self, filename: Path, title: str, subtitle: str):
        self.report_title = title
        self.subtitle = subtitle
        super().__init__(
            str(filename),
            pagesize=LETTER,
            leftMargin=MARGIN_X,
            rightMargin=MARGIN_X,
            topMargin=MARGIN_TOP,
            bottomMargin=MARGIN_BOTTOM,
            title=title,
            author="MAD Prospects",
        )
        frame = Frame(MARGIN_X, MARGIN_BOTTOM, CONTENT_W, PAGE_H - MARGIN_TOP - MARGIN_BOTTOM, id="normal")
        self.addPageTemplates([PageTemplate(id="default", frames=[frame], onPage=self._decorate)])

    def _decorate(self, canv: canvas.Canvas, doc):
        if doc.page == 1:
            return
        canv.saveState()
        canv.setStrokeColor(PALETTE["line"])
        canv.setLineWidth(0.5)
        canv.line(MARGIN_X, PAGE_H - 0.55 * inch, PAGE_W - MARGIN_X, PAGE_H - 0.55 * inch)
        canv.setFont("Helvetica", 7.5)
        canv.setFillColor(PALETTE["muted"])
        canv.drawString(MARGIN_X, PAGE_H - 0.42 * inch, self.report_title)
        canv.drawRightString(PAGE_W - MARGIN_X, 0.42 * inch, f"Page {doc.page}")
        canv.restoreState()


def cover(title: str, subtitle: str, tag: str):
    story = []
    story.append(Spacer(1, 0.34 * inch))
    panel = Table(
        [
            [para(tag.upper(), "cover_kicker")],
            [para(title, "cover_title")],
            [para(subtitle, "cover_subtitle")],
        ],
        colWidths=[CONTENT_W],
        rowHeights=[0.52 * inch, 1.25 * inch, 0.8 * inch],
    )
    panel.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALETTE["dark"]),
                ("BOX", (0, 0), (-1, -1), 1, PALETTE["dark"]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 24),
                ("RIGHTPADDING", (0, 0), (-1, -1), 24),
            ]
        )
    )
    story += [panel, Spacer(1, 0.26 * inch)]
    story.append(
        callout(
            "Document scope",
            "Prepared from the current MADCreate repository structure, frontend routes, .NET Core modules, shared TypeScript contracts, Entity Framework Core, and deployment notes. Where infrastructure notes and code disagree, the documents call out the reconciliation point instead of hiding it.",
            "blue",
        )
    )
    story.append(Spacer(1, 0.18 * inch))
    story.append(para("Generated for MAD Prospects. Current canonical public domains: https://madcreate.madprospects.com and https://madcreateapi.madprospects.com.", "small"))
    story.append(PageBreak())
    return story


def manual_story():
    s = cover(
        "MADCreate User Manual",
        "A detailed operator guide for the AI-native website and business-system generator.",
        "Application handbook",
    )
    s += [
        para("How To Use This Manual", "h1"),
        para("This manual is written for owners, super administrators, workspace operators, client-facing implementation teams, and support staff. It explains what MADCreate does, how the screens fit together, and how the backend systems support each workflow."),
        para("Practical route map", "h2"),
        bullets(
            [
                "Public pages: landing, pricing, login, registration, email verification, password reset, magic-link sign-in, and workspace invitation acceptance.",
                "Authenticated platform: /app/home, onboarding, tenants, sites, AI Studio, visual builder, themes, domains, integrations, deployments, analytics, leads, media, marketplace, settings, Claude tasks, and super-admin.",
                "Public tenant rendering: /:slug and /:slug/:page render generated websites from stored site, page, section, theme, navigation, SEO, and media data.",
            ]
        ),
        para("Core Concept", "h1"),
        para("MADCreate is a multi-tenant SaaS platform that lets a team generate, edit, publish, host, and operate websites or lightweight business systems. It combines an Angular SPA, a .NET Core REST API, Entity Framework Core relational data, a shared TypeScript contract package, queue workers for long-running work, and deployment adapters for multiple publishing targets."),
        callout("Plain-English model", "A workspace is the customer account. A tenant is a deployable client brand, site, or business instance inside that workspace. A tenant owns sites, pages, sections, themes, domains, deployments, integrations, media, analytics events, forms, and leads.", "teal"),
        para("Architecture at a glance", "h2"),
        table(
            [
                ["Layer", "What it does", "Important implementation notes"],
                ["Angular web app", "Provides marketing, auth, dashboard, builder, analytics, and public tenant rendering.", "Standalone components, route-level lazy loading, Tailwind styling, auth/workspace interceptors, and a dynamic renderer for section schemas."],
                [".NET Core API", "Owns auth, tenant/workspace access, AI generation, CRUD, deployments, domains, billing, forms, media, and admin operations.", "Global /v1 prefix, validation pipe, response wrapper, audit interceptor, throttling, pino logging, Swagger in non-production."],
                ["Entity Framework Core data model", "Stores identity, workspace membership, tenant content, AI records, integrations, analytics, billing, and audit logs.", "Repository schema declares a SQL Server datasource using the MADProspects production MSSQL host."],
                ["Queues and workers", "Handle AI generation, deployment runs, email work, and background tasks.", "BullMQ queues are wired through the queue module; deployment and AI modules expose event streams for live UI updates."],
                ["Public renderer", "Turns JSON content into themed websites at tenant slugs and custom domains.", "Fetches render payloads from /v1/render/site and dispatches each section kind to a matching Angular section component."],
            ],
            [1.2 * inch, 2.15 * inch, 3.15 * inch],
        ),
        para("Roles And Access", "h1"),
        para("MADCreate uses role-aware access at the platform and workspace level. The codebase defines SUPER_ADMIN, WORKSPACE_OWNER, ADMIN, EDITOR, VIEWER, and CLIENT. The Angular app uses an auth guard for /app and a super-admin guard for /app/admin; the API uses JWT guards, role decorators, and tenant/workspace checks in services."),
        table(
            [
                ["Role", "Typical purpose", "Expected capabilities"],
                ["SUPER_ADMIN", "Platform operator.", "Access admin overview, tenant administration, feature flags, suspension, deletion, and cross-tenant support views."],
                ["WORKSPACE_OWNER", "Account owner and billing authority.", "Manage workspace settings, members, billing portal, tenants, sites, and deployments."],
                ["ADMIN", "Operational lead.", "Manage most workspace and tenant assets, publish content, configure domains and integrations."],
                ["EDITOR", "Content and build user.", "Create and edit pages, themes, AI generations, media, leads, and deployments where permitted."],
                ["VIEWER / CLIENT", "Read-only or client review user.", "Inspect assigned workspace/tenant output and analytics with limited mutation rights."],
            ],
            [1.25 * inch, 1.85 * inch, 3.4 * inch],
        ),
        para("Authentication Workflows", "h1"),
        para("The authentication surface supports registration, login, refresh tokens, logout, password reset, email verification, password change, magic-link request/exchange, and invitation acceptance. The frontend stores tokens through the auth service and appends bearer tokens through an interceptor."),
        numbered(
            [
                "A user registers or accepts a workspace invite.",
                "The API creates or links the user, workspace membership, and refresh-token state.",
                "On login, the user receives access and refresh tokens plus workspace context.",
                "The web app stores the session and redirects into /app/home.",
                "The workspace interceptor adds X-Workspace-Id to normal dashboard requests when a workspace is selected.",
            ]
        ),
        callout("Security note", "Do not embed live passwords in operator PDFs or screenshots. Store production super-admin credentials in the approved password vault, rotate them after provisioning, and use per-user accounts for day-to-day work.", "orange"),
        para("Workspace Home", "h1"),
        para("The dashboard home is the operator landing point after login. It loads the current workspace, lists tenants, and shows aggregate stats for tenants, sites, AI generations, and deployments. It is intended to answer: what am I responsible for, what exists already, and where should I go next?"),
        para("Onboarding", "h1"),
        para("Onboarding guides a user through the first tenant/site setup. It captures business details, industry, goals, desired integrations, and website requirements. It can create a tenant, save onboarding answers, suggest integrations by industry, and trigger generation through the AI pipeline."),
        table(
            [
                ["Step", "User goal", "System behavior"],
                ["Business profile", "Describe the client, offer, industry, tone, and audience.", "Saves structured onboarding answers against the selected tenant."],
                ["Integration selection", "Choose useful apps and channels.", "Loads the integration catalog and /integrations/suggest output for the industry."],
                ["Generate", "Produce a first website draft.", "Calls /onboarding/generate, creates an AI generation record, then polls generation status."],
                ["Review", "Inspect and refine the draft.", "Links into the tenant, site detail, AI Studio, or builder workflows."],
            ],
            [1.15 * inch, 2.2 * inch, 3.15 * inch],
        ),
        para("Tenants", "h1"),
        para("Tenants are the central client/project container. The tenants list shows all tenants in the selected workspace. Tenant detail provides deeper information and links into related sites, domains, deployment history, onboarding, and editing tools. Tenant records also support soft deletion and administrative suspension/purge operations."),
        para("Sites, Pages, And Sections", "h1"),
        para("A site belongs to a tenant and contains pages. A page contains a schema with ordered sections. Sections are typed blocks such as hero, features, logos, testimonials, pricing, FAQ, CTA, gallery, team, stats, contact, rich-text, video, newsletter, footer, header, split, and steps. This schema is the contract between AI generation, storage, editing, publishing, and rendering."),
        table(
            [
                ["Object", "What it represents", "Where users meet it"],
                ["Site", "A deployable website/application shell with status, navigation, settings, and version.", "Sites list, site detail, deployments, renderer."],
                ["Page", "A route-level document such as home, about, services, pricing, or contact.", "Site detail, builder, publish actions."],
                ["Section", "A reusable content and layout block inside a page.", "Builder and public site renderer."],
                ["Theme", "Color, typography, spacing, and visual tokens.", "Themes page, renderer CSS variables."],
            ],
            [1.1 * inch, 2.55 * inch, 2.85 * inch],
        ),
        para("Visual Builder", "h1"),
        para("The builder opens a page by page id, shows the page schema, allows operators to modify sections, saves updates through /pages/:id, publishes through /pages/:id/publish, and can request AI-generated section content. It is the hands-on editing surface for turning generated output into production-ready client material."),
        bullets(
            [
                "Use builder edits for copy, section ordering, section props, and publication readiness.",
                "Use the site detail page for page creation, deletion, and site-level publishing.",
                "Use themes for global visual direction rather than one-off section styling where possible.",
            ]
        ),
        para("AI Studio", "h1"),
        para("AI Studio is the generation control room. Operators choose a tenant, submit generation requests, watch history, and receive live updates via server-sent events when available. The backend supports generation kinds including site, page, section, copy, theme, palette, typography, image prompt, SEO, schema, and workflow."),
        para("AI generation lifecycle", "h2"),
        numbered(
            [
                "The frontend posts a generation request to /v1/ai/generate with kind, prompt variables, and tenant context.",
                "The API creates an AIGeneration record with status QUEUED and enqueues work.",
                "A worker picks the job, calls the configured provider, captures output, tokens, cost, and duration.",
                "The result is stored as JSON and exposed through /ai/generations and /ai/generations/:id.",
                "Some results can be submitted/applied back into site/page/theme records.",
            ]
        ),
        para("Themes", "h1"),
        para("Themes manage design tokens. A tenant can have multiple themes, one active theme, and AI-generated palettes. The public renderer applies active theme tokens to CSS variables, which lets generated sites keep a coherent brand without manually restyling every section."),
        para("Domains", "h1"),
        para("Domains connect a tenant to public hostnames. The domains page lets users add hostnames, view DNS instructions, verify records, and delete domains. The API supports domain types SUBDOMAIN, APEX, CNAME, and WILDCARD with statuses PENDING, VERIFYING, ACTIVE, FAILED, and DISABLED."),
        table(
            [
                ["Domain task", "What the user does", "What the platform checks"],
                ["Add domain", "Enter hostname and select type.", "Creates a domain record and verification token."],
                ["Read instructions", "Copy CNAME/TXT or other DNS guidance.", "Returns values from /domains/:id/instructions."],
                ["Verify", "Click verify after DNS has propagated.", "Looks up DNS records and activates the domain when records match."],
                ["Render", "Visit the custom hostname.", "Tenant middleware and render service resolve the tenant by host."],
            ],
            [1.25 * inch, 2.25 * inch, 3 * inch],
        ),
        para("Deployments", "h1"),
        para("Deployments publish or export tenant output. The deployments page lists recent runs, can trigger a target-specific deployment, can cancel pending/running work, and receives live updates. A deployment record tracks target, status, log, artifact URL, version, timing, and triggering user."),
        table(
            [
                ["Target", "Purpose"],
                ["INTERNAL", "Publish inside the MADCreate platform and bump the active site version."],
                ["STATIC_EXPORT", "Write static HTML output for handoff, archive, or external hosting."],
                ["FTP / SFTP", "Push built output to a traditional hosting account."],
                ["CLOUDFLARE_PAGES", "Publish through Cloudflare Pages."],
                ["VERCEL", "Deploy to a Vercel project/team."],
                ["DIGITAL_OCEAN", "Deploy through DigitalOcean App Platform."],
                ["DOCKER", "Build and push a container image."],
                ["CUSTOM_WEBHOOK", "Notify an external system that a deployment should happen."],
            ],
            [1.8 * inch, 4.7 * inch],
        ),
        para("Integrations", "h1"),
        para("The integration catalog provides installable app connectors by category. Users can browse the catalog, install an integration for a tenant with JSON config, list installed integrations, and uninstall them. The current service behavior stores per-tenant configuration and enablement; provider-specific deep sync logic can be added behind the catalog entries."),
        para("Media Library", "h1"),
        para("The media module lets a tenant upload, list, and delete assets. Media records include kind, URLs, metadata, size, uploader, and tenant ownership. Storage is abstracted so local disk can be swapped for object storage when configured."),
        para("Forms And Leads", "h1"),
        para("Generated sites can contain contact or lead forms. The forms API receives public submissions, while the leads UI lets authenticated users list leads by tenant and update lead status. This makes MADCreate more than a brochure builder: it can capture and manage client demand."),
        table(
            [
                ["Lead stage", "Operational meaning"],
                ["NEW", "Fresh submission requiring triage."],
                ["CONTACTED", "Someone has reached out to the prospect."],
                ["QUALIFIED", "The opportunity is worth active follow-up."],
                ["WON / LOST", "Outcome is known and can feed reporting."],
                ["SPAM", "Submission should be excluded from normal sales work."],
            ],
            [1.5 * inch, 5 * inch],
        ),
        para("Analytics", "h1"),
        para("Analytics ingests page views, clicks, form submissions, conversions, AI generation events, deployments, and custom events. The dashboard exposes summary metrics, timeline, time series, top pages, and referrers for a selected tenant and date window."),
        para("Marketplace And Templates", "h1"),
        para("The marketplace lists templates and can instantiate a template into a tenant. Template instantiation clones the full site schema into a new site and pages, giving operators a repeatable starting point for common industries or campaign types."),
        para("Settings, Workspace Members, And Billing", "h1"),
        para("Settings combines profile editing, password change, workspace invite management, member listing, leave-workspace, billing subscription display, Payfast subscription handoff, and account deletion. Workspace owners should use this area to keep team membership and billing data current."),
        para("Super Admin", "h1"),
        para("The super-admin page is reserved for platform operators. It loads platform overview metrics, tenant listings, feature flags, and tenant actions such as suspend, unsuspend, and delete. Use it carefully: the admin surface can affect many customers."),
        para("Claude Tasks And Prompt Templates", "h1"),
        para("MADCreate includes an internal Claude task board and prompt-template manager. The UI can list tasks, create/edit/delete tasks, upload attachments, poll worker settings, import bulk errors, and manage reusable Claude prompt templates. This is an operator automation surface for development, QA, content work, or assisted build tasks."),
        para("Public Site Rendering", "h1"),
        para("The renderer is the customer-facing delivery mechanism. A request to /:slug or /:slug/:page loads tenant/site JSON through /render/site, applies active theme tokens, updates page metadata, and renders each section with a matching component. The API also provides dynamic robots.txt and sitemap.xml endpoints."),
        callout("Renderer principle", "Generated sites are data-driven. A published page is not hard-coded Angular markup; it is a typed page schema interpreted by the renderer. That is what makes AI generation, template cloning, builder edits, and multi-tenant hosting work together.", "purple"),
        para("Operational Checklist", "h1"),
        bullets(
            [
                "Confirm canonical domains and CORS origins: https://madcreate.madprospects.com and https://madcreateapi.madprospects.com.",
                "Confirm database provider and connection target before migrations; repository schema and latest infrastructure notes currently need reconciliation.",
                "Provision a super-admin account without publishing its password in documentation.",
                "Keep API_CORS_ORIGINS, JWT secrets, SMTP, Payfast, Cloudflare, storage, AI provider keys, and deployment credentials in environment configuration.",
                "Run health and readiness checks after deploy, then smoke-test login, tenant list, render payload, and a deployment target.",
                "Keep pnpm store centralized at C:/Code/.pnpm when maintaining the Windows workspace.",
            ]
        ),
        para("Troubleshooting Guide", "h1"),
        table(
            [
                ["Symptom", "Likely area", "First checks"],
                ["Login blocked by browser CORS", "API bootstrap / hosting proxy", "Check API_CORS_ORIGINS, OPTIONS handling, Apache/IIS/web.config headers, and API process restart."],
                ["Dashboard loads but data is empty", "Workspace context", "Check stored workspace id, X-Workspace-Id header, membership status, and /workspaces response."],
                ["Generated site does not render", "Tenant/site/page status", "Confirm tenant slug, published site/page, active theme, /render/site response, and browser console."],
                ["Domain stuck pending", "DNS verification", "Confirm CNAME/TXT values, DNS propagation, Cloudflare proxy mode, and verify endpoint logs."],
                ["Deployment hangs", "BullMQ/worker", "Check Redis, queue processor, deployment log, target credentials, and worker process status."],
                ["AI generation never completes", "Provider/queue", "Check queue worker, API key, prompt template, provider output JSON validity, and AIGeneration error field."],
            ],
            [1.75 * inch, 1.55 * inch, 3.2 * inch],
        ),
        para("Glossary", "h1"),
        table(
            [
                ["Term", "Definition"],
                ["Workspace", "Customer account and billing/team container."],
                ["Tenant", "A client, brand, business unit, or deployable instance inside a workspace."],
                ["Site", "A website/application shell owned by a tenant."],
                ["Page schema", "The JSON structure describing page title, SEO, and ordered sections."],
                ["Section", "A typed content/layout block rendered by Angular components."],
                ["Theme token", "Reusable visual value such as colors, fonts, spacing, or radius."],
                ["Deployment adapter", "A target-specific publisher such as internal, SFTP, Cloudflare Pages, Vercel, or webhook."],
                ["Integration catalog", "The list of apps/connectors a tenant can install."],
            ],
            [1.65 * inch, 4.85 * inch],
        ),
    ]
    s += manual_appendix()
    return s


def manual_appendix():
    return [
        PageBreak(),
        para("Appendix A: Frontend Screen Reference", "h1"),
        table(
            [
                ["Screen", "Route", "Primary job"],
                ["Landing", "/ and /home", "Explain the product and route prospects to pricing, login, or registration."],
                ["Pricing", "/pricing", "Show plans from /billing/plans and start checkout for a workspace when authenticated."],
                ["Login/Register", "/login and /register", "Create or resume a platform session."],
                ["Invite acceptance", "/accept-invite", "Exchange invitation token and join a workspace."],
                ["Dashboard home", "/app/home", "Show workspace stats and the current tenant portfolio."],
                ["Onboarding", "/app/onboarding and /app/onboarding/:tenantId", "Capture client brief and generate an initial tenant/site."],
                ["Tenants", "/app/tenants and /app/tenants/:id", "List, inspect, and manage client/project containers."],
                ["Sites", "/app/sites and /app/sites/:id", "List sites, create pages, publish, and open the builder."],
                ["AI Studio", "/app/studio/:tenantId", "Submit AI generation jobs and review generation history."],
                ["Builder", "/app/builder/:pageId", "Edit page schema, save changes, publish pages, and request AI section updates."],
                ["Themes", "/app/themes", "Create, edit, activate, delete, and generate visual themes."],
                ["Domains", "/app/domains", "Add hostnames, view DNS instructions, verify, and remove domains."],
                ["Integrations", "/app/integrations", "Browse catalog, install tenant integrations, and remove installed integrations."],
                ["Deployments", "/app/deployments", "Trigger deployments, watch status, and cancel pending/running jobs."],
                ["Analytics", "/app/analytics", "Read summary, timeline, timeseries, top pages, and referrer reports."],
                ["Leads", "/app/leads", "Review form submissions and update lead status."],
                ["Media", "/app/media", "Upload, list, and delete tenant media assets."],
                ["Marketplace", "/app/marketplace", "Browse templates and instantiate them into tenants."],
                ["Settings", "/app/settings", "Manage profile, password, workspace invites/members, billing, and account lifecycle."],
                ["Claude", "/app/claude", "Operate internal task queue, worker settings, attachments, and prompt templates."],
                ["Admin", "/app/admin", "Super-admin overview, tenant controls, and feature flags."],
                ["Tenant renderer", "/:slug and /:slug/:page", "Serve public generated websites."],
            ],
            [1.45 * inch, 1.55 * inch, 3.5 * inch],
        ),
        para("Appendix B: API Endpoint Map", "h1"),
        table(
            [
                ["Area", "Endpoints", "Notes"],
                ["Auth", "POST /auth/register, /auth/login, /auth/refresh, /auth/logout, /auth/password/request-reset, /auth/password/reset, /auth/email/verify, /auth/password/change, /auth/magic/request, /auth/magic", "Session, recovery, verification, and password lifecycle."],
                ["Users", "GET/PATCH/DELETE /users/me", "Profile and account self-service."],
                ["Workspaces", "GET /workspaces, GET/PATCH /workspaces/:id, POST /workspaces/:id/invites, GET /workspaces/:id/members, GET /workspaces/:id/stats, POST /workspaces/invites/accept, POST /workspaces/:id/members/leave", "Team and account container operations."],
                ["Tenants", "GET/POST /tenants, GET/PATCH/DELETE /tenants/:id, POST /tenants/purge-expired, POST /tenants/:id/purge", "Client/project lifecycle."],
                ["Sites/Pages", "GET/POST/PATCH/DELETE /sites and /pages, POST /sites/:id/publish, POST /pages/:id/publish", "Website content structure and publishing."],
                ["AI", "POST /ai/generate, GET /ai/generations, GET /ai/generations/:id, POST /ai/generations/:id/submit", "Generation job creation, polling, and apply-back."],
                ["Render", "GET /render/site, /render/site/:slug/page/:pageSlug, /render/:slug/robots.txt, /render/:slug/sitemap.xml", "Public site payloads and SEO assets."],
                ["Domains", "GET/POST /domains, GET /domains/:id/instructions, POST /domains/:id/verify, DELETE /domains/:id", "Hostname management and DNS verification."],
                ["Deployments", "GET/POST /deployments, GET /deployments/:id, POST /deployments/:id/cancel", "Publishing jobs and history."],
                ["Integrations", "GET /integrations/catalog, /integrations/suggest, /integrations/installed, POST /integrations/install, DELETE /integrations/:id", "Catalog and tenant installation state."],
                ["Forms/Leads", "POST/GET /forms, GET /leads, PATCH /leads/:id", "Public submissions and internal lead management."],
                ["Analytics", "POST /analytics/ingest, GET /analytics/summary, /timeline, /timeseries, /top-pages, /referrers", "Event capture and reporting."],
                ["Media", "GET /media, POST /media/upload, DELETE /media/:id", "Tenant asset management."],
                ["Billing", "GET /billing/plans, /billing/subscription, POST /billing/checkout, /billing/portal, POST /payments/payfast/onsite, POST /payments/payfast/notify", "Plans, subscription state, and Payfast onsite checkout."],
                ["Admin", "GET /admin/overview, /admin/tenants, /admin/flags, POST /admin/flags, PATCH /admin/tenants/:id/suspend, PATCH /admin/tenants/:id/unsuspend, DELETE /admin/tenants/:id", "Platform operator controls."],
            ],
            [1.05 * inch, 3.45 * inch, 2.0 * inch],
        ),
        para("Appendix C: Data Model Reference", "h1"),
        table(
            [
                ["Cluster", "Models", "Purpose"],
                ["Identity", "User, RefreshToken, EmailVerification, PasswordReset, MagicLink", "Login, recovery, verification, token rotation, and profile state."],
                ["Workspace", "Workspace, WorkspaceMember, WorkspaceInvite, ApiKey", "Account/team boundary, role assignment, invites, and programmatic access."],
                ["Tenant content", "Tenant, Environment, Site, Page, Layout, Section, Theme, Template", "Client/project, generated site structure, page schema, reusable layouts, themes, and template cloning."],
                ["Publishing", "Domain, Deployment", "Hostname ownership, DNS verification, deployment target, status, logs, artifacts, and versioning."],
                ["AI", "AIPrompt, AIGeneration", "Prompt registry, provider, kind, status, input/output JSON, cost, tokens, and request metadata."],
                ["Assets and events", "Media, AnalyticsEvent, FormSubmission, Lead", "Files, behavioral analytics, public form capture, and lead management."],
                ["Commercial", "Plan, Subscription, FeatureFlag", "Pricing, workspace entitlement, and feature control."],
                ["Operations", "TenantIntegration, IntegrationCatalog, AuditLog, ClaudeTask, ClaudePromptTemplate", "Installed apps, app catalog, auditability, task automation, and reusable prompts."],
            ],
            [1.25 * inch, 2.55 * inch, 2.7 * inch],
        ),
        para("Appendix D: Section Renderer Reference", "h1"),
        table(
            [
                ["Section kind", "Typical props", "Usage guidance"],
                ["hero", "eyebrow, heading, subheading, CTAs, media, alignment", "Use for first impression, offer, proof, and primary action."],
                ["features", "heading, subheading, item list, columns", "Use for benefits, service groups, platform modules, or reasons to believe."],
                ["pricing", "tiers, prices, intervals, features, highlighted tier", "Use where the offer is productized or package-based."],
                ["faq", "question/answer list", "Use to reduce objections before a CTA or contact form."],
                ["cta", "heading, subheading, primary/secondary CTA", "Use after proof or near page end to drive action."],
                ["gallery/video/logos", "media references and captions", "Use visual proof sparingly and keep media optimized."],
                ["team/testimonials/stats", "people, quotes, metrics", "Use credibility blocks with real proof where possible."],
                ["contact/newsletter/forms", "contact fields, form key, copy", "Use when capture, inquiry, or subscription is the page goal."],
                ["rich-text/split/steps", "structured copy, columns, ordered steps", "Use for explanatory content, processes, and detailed service pages."],
            ],
            [1.3 * inch, 2.45 * inch, 2.75 * inch],
        ),
        para("Appendix E: Operator Runbooks", "h1"),
        para("Create a new client site", "h2"),
        numbered(
            [
                "Create or select the workspace and tenant.",
                "Complete onboarding with industry, offer, audience, proof, tone, pages, and integration needs.",
                "Generate the initial site and review AI output in the AI Studio.",
                "Open site detail, inspect pages, and use the builder for copy and section refinement.",
                "Configure active theme, upload media, connect forms, and verify analytics.",
                "Add and verify the production domain.",
                "Trigger an internal deployment, then run a public render smoke test.",
                "Share the site or client review link, collect revisions, and publish final pages.",
            ]
        ),
        para("Recover from a broken public site", "h2"),
        numbered(
            [
                "Check the frontend route and browser console.",
                "Call /v1/render/site for the tenant slug and confirm the payload is not empty.",
                "Confirm tenant, site, page, theme, and domain statuses.",
                "Check recent deployments and logs.",
                "If the issue followed a content edit, restore or republish the prior known-good page schema.",
                "If the issue is domain-specific, test the canonical MADCreate slug and then diagnose DNS/SSL/host resolution.",
            ]
        ),
        para("Deployment handoff checklist", "h2"),
        bullets(
            [
                "Public URL loads on desktop and mobile.",
                "Primary navigation and CTAs resolve correctly.",
                "Forms submit and appear in Leads.",
                "Analytics records at least one test page view.",
                "Sitemap and robots endpoints respond.",
                "Domain verification is active and SSL is valid.",
                "Workspace owner and support contacts are correct.",
            ]
        ),
        para("Appendix F: Environment And Deployment Notes", "h1"),
        para("MADCreate is intended to run as a .NET Core API and Angular SPA, currently deployed behind DreamHost CloudCompute / Apache reverse proxy according to project notes. The canonical production domains are madcreate.madprospects.com and madcreateapi.madprospects.com, with API port 3005 behind the proxy."),
        callout("Database standard", "MADCreate uses SQL Server at WINSVRSQL03.hostserv.co.za,1433. Keep Entity Framework Core, environment examples, docs, and deployment scripts aligned to the same MSSQL connection settings before changing migrations or production data.", "orange"),
        table(
            [
                ["Setting", "Operational guidance"],
                ["API_CORS_ORIGINS", "Must include the production frontend origin and local dev origin where needed."],
                ["JWT secrets", "Unique per environment; rotate if exposed."],
                ["DATABASE_URL", "Must match the actual Entity Framework Core provider and target DB engine."],
                ["REDIS_URL", "Required for queues, workers, and live job behavior."],
                ["SMTP", "Required for verification, reset, magic link, and invites; graceful no-op behavior should still be tested."],
                ["AI provider keys", "Required for real generation; mock/manual provider paths should be explicit in non-production."],
                ["Storage", "Local or object storage; production should avoid accidental ephemeral disk dependence."],
                ["Deployment credentials", "Store in environment or vault-backed references, not in tenant-visible config."],
            ],
            [1.75 * inch, 4.75 * inch],
        ),
    ]


def ideas_story():
    s = cover(
        "MADCreate Ideas",
        "Enhancement concepts and MADProspects Universe integration opportunities.",
        "Product growth playbook",
    )
    s += [
        para("Strategic Direction", "h1"),
        para("MADCreate can become the front door for a broader MADProspects operating system: generate the website, capture demand, enrich leads, nurture prospects, recruit talent, manage campaigns, automate follow-up, and report everything back to one universe-level customer graph."),
        callout("North-star idea", "Position MADCreate as the creation layer: every business system in the MADProspects Universe can request a landing page, portal, campaign microsite, form, quote flow, recruiting page, or client workspace from MADCreate and receive a hosted, measurable, editable experience.", "teal"),
        para("Near-Term Product Enhancements", "h1"),
        table(
            [
                ["Idea", "Why it matters", "Implementation sketch"],
                ["Guided launch room", "Turns onboarding into a visible launch checklist.", "Show steps for brand, pages, AI draft, media, domain, analytics, forms, deployment, and handoff with completion badges."],
                ["Industry-specific blueprints", "Makes first drafts feel less generic.", "Seed template packs for recruiters, property, finance, legal, healthcare, training, agencies, trades, ecommerce, and local services."],
                ["AI brief quality score", "Improves generation quality before spending tokens.", "Score onboarding answers for specificity, missing audience, missing offer, weak proof, and missing CTA."],
                ["Section variant lab", "Lets users compare several hero/pricing/CTA options.", "Generate 3 to 5 variants, save favorites, and A/B test after publish."],
                ["Client review mode", "Reduces feedback chaos.", "Share a secure review link where clients comment on sections without getting full admin access."],
            ],
            [1.45 * inch, 2.1 * inch, 2.95 * inch],
        ),
        para("Builder Enhancements", "h1"),
        bullets(
            [
                "Add drag-and-drop section ordering with undo/redo history and autosave snapshots.",
                "Introduce inline text editing directly inside the preview, with structured schema updates behind the scenes.",
                "Add block-level version history so an operator can restore a previous hero, pricing table, or contact section without reverting the whole page.",
                "Create a style inspector that edits theme tokens and immediately shows their effect across every page.",
                "Add accessibility checks for contrast, heading order, image alt text, button labels, and form labels.",
                "Add responsive preview breakpoints for mobile, tablet, laptop, and widescreen with screenshot export for approvals.",
            ]
        ),
        para("AI And Automation Enhancements", "h1"),
        table(
            [
                ["Capability", "Value", "Notes"],
                ["Brand memory", "Keeps generated content consistent across tenants and campaigns.", "Store approved phrases, taboo words, tone rules, claims, audience segments, and proof points per workspace."],
                ["Research agent", "Builds richer drafts.", "Pull website/social/company data, summarize competitors, detect offers, and propose positioning before generation."],
                ["Content freshness monitor", "Keeps sites current.", "Schedule monthly checks for outdated dates, old offers, broken links, stale testimonials, and weak SEO titles."],
                ["Lead response agent", "Speeds follow-up.", "Draft email/SMS/WhatsApp replies from form context, source page, and MADLeads history."],
                ["Prompt governance", "Makes AI work auditable.", "Version prompt templates, show diff, approve changes, and tie each generation to template version."],
            ],
            [1.55 * inch, 2.05 * inch, 2.9 * inch],
        ),
        para("MADProspects Universe Integration Map", "h1"),
        para("The most powerful direction is to treat MADCreate as one app in a shared universe rather than an isolated website builder. The shared fabric should include identity, workspace/tenant mapping, contact/lead identity, events, billing, consent, media, automation tasks, and notifications."),
        table(
            [
                ["Universe app", "Integration idea", "MADCreate benefit"],
                ["MADLeads", "Sync form submissions, page-source attribution, UTM data, lead status, scoring, and follow-up outcomes.", "Every generated website becomes a measurable acquisition channel."],
                ["MADRecruiting", "Generate job boards, role landing pages, candidate application funnels, interview scheduling pages, and employer-brand microsites.", "Recruiters can launch campaign-specific pages without design or dev work."],
                ["MADSales / CRM", "Push qualified leads, contact timeline, proposal links, and quote requests into the sales pipeline.", "Website activity becomes sales context instead of a disconnected contact form."],
                ["MADMarketing", "Launch campaign pages, A/B variants, newsletter signups, tracking pixels, and performance reports.", "Campaign teams can move from brief to live microsite faster."],
                ["MADForms", "Use a shared form builder and submission schema across all MAD apps.", "Contact, quote, application, booking, and intake forms become reusable assets."],
                ["MADBilling", "Provision subscription plans, usage limits, workspace invoices, and client billing portals.", "Plans, quotas, and upsells can be managed centrally."],
                ["MADAnalytics", "Aggregate events across websites, email, ads, CRM, and recruiting funnels.", "Operators get a unified view of acquisition and conversion."],
                ["MADAssist / Agent layer", "Let agents create pages, update content, triage leads, prepare reports, and execute deployment checklists.", "MADCreate becomes action-capable, not just generative."],
            ],
            [1.35 * inch, 2.75 * inch, 2.4 * inch],
        ),
        para("Shared Identity And Tenant Graph", "h1"),
        para("The universe needs a canonical identity graph. A person may be a lead in MADLeads, a candidate in MADRecruiting, a client contact in CRM, a workspace user in MADCreate, and a billing contact in MADBilling. The applications should not create disconnected duplicates."),
        bullets(
            [
                "Create a Universe Contact ID with source identities linked by email, phone, domain, company, and consent.",
                "Use a shared Workspace ID and Tenant/Client ID across apps so one client can move between website, CRM, recruiting, and billing workflows.",
                "Centralize role and permission grants while allowing app-specific capabilities.",
                "Emit normalized events: page_view, form_submit, lead_status_changed, candidate_applied, deployment_success, invoice_paid, campaign_launched.",
                "Add a consent and communication-preferences service for POPIA/GDPR-friendly marketing and recruiting communication.",
            ]
        ),
        para("Deep Integration Ideas", "h1"),
        table(
            [
                ["Workflow", "How it works"],
                ["Lead-to-site feedback loop", "MADLeads identifies top converting industries/offers; MADCreate suggests better sections, CTAs, and proof blocks based on conversion data."],
                ["Recruiting campaign launcher", "MADRecruiting sends job role, location, salary range, employer brand, and screening questions; MADCreate generates a live role microsite and application form."],
                ["CRM proposal pages", "MADSales sends opportunity data; MADCreate generates a secure proposal microsite with pricing, timeline, FAQ, acceptance CTA, and analytics."],
                ["Automated client onboarding", "A new MADProspects client triggers workspace creation, default tenant, starter site, analytics, lead sync, billing plan, and review link."],
                ["Universe command center", "A shared dashboard shows websites live, leads captured, candidates applied, campaigns active, invoices due, and agent actions queued."],
            ],
            [1.85 * inch, 4.65 * inch],
        ),
        para("Integration Architecture Recommendations", "h1"),
        numbered(
            [
                "Define a common Universe API contract for workspace, tenant/client, contact, event, consent, and notification objects.",
                "Introduce an event bus or webhook gateway so every app can publish and subscribe without point-to-point spaghetti.",
                "Adopt OAuth-style app installation for internal MAD apps as well as third parties.",
                "Use idempotency keys for lead sync, form submissions, deployment callbacks, and billing events.",
                "Build a shared integration registry with app capabilities, scopes, config schema, health state, and last sync timestamp.",
                "Create a Universe audit log so high-risk actions remain traceable across apps.",
            ]
        ),
        para("Data Model Enhancements", "h1"),
        table(
            [
                ["Entity", "Suggested additions"],
                ["Tenant", "universeClientId, lifecycleStage, primaryDomainHealth, brandMemoryId, defaultLanguage, complianceRegion."],
                ["Lead/FormSubmission", "universeContactId, sourceCampaignId, consentSnapshotId, score, routingOwner, SLA deadline."],
                ["AIGeneration", "promptTemplateVersion, inputQualityScore, approvalStatus, appliedAt, rollbackTargetId."],
                ["Deployment", "environment, release notes, build hash, smoke-test result, rollback deployment id."],
                ["Integration", "scopes, health status, last error, sync cursor, credential vault reference."],
                ["AnalyticsEvent", "session id, visitor id, campaign id, contact id, experiment id, consent state."],
            ],
            [1.45 * inch, 5.05 * inch],
        ),
        para("Commercial Packaging Ideas", "h1"),
        bullets(
            [
                "Launch-in-a-day package: onboarding, AI-generated site, domain, form, lead sync, and first campaign report.",
                "Recruiting growth pack: role pages, employer brand, candidate forms, calendar booking, and MADRecruiting sync.",
                "Lead engine pack: MADCreate site plus MADLeads routing, automated response templates, analytics, and conversion optimization.",
                "Agency operations pack: multi-client workspace, template library, client review portals, approval workflows, and deployment history.",
                "Enterprise governance pack: SSO, audit exports, prompt approvals, data residency, retention policies, and role-based publishing.",
            ]
        ),
        para("User Experience Ideas", "h1"),
        table(
            [
                ["Experience", "Description"],
                ["Launch timeline", "A horizontal launch path showing brief, content, design, domain, integrations, QA, deploy, and optimization."],
                ["AI copilot sidebar", "Contextual assistant inside every page: improve this section, explain poor conversion, generate FAQ, check tone, summarize leads."],
                ["Site health score", "Combines domain status, SSL, analytics, form deliverability, SEO basics, performance, accessibility, and deployment freshness."],
                ["Approval inbox", "Client comments, pending copy approvals, domain tasks, failed deployments, and stale leads in one focused queue."],
                ["Universe activity feed", "Every important event from MADCreate, MADLeads, MADRecruiting, and billing in a unified timeline."],
            ],
            [1.65 * inch, 4.85 * inch],
        ),
        para("Analytics And Optimization Ideas", "h1"),
        bullets(
            [
                "Built-in A/B testing for hero headlines, CTAs, form length, pricing layouts, and testimonials.",
                "Conversion heat summaries by section, not just page, using click and form-start events.",
                "AI-generated monthly client reports with plain-English wins, issues, and next actions.",
                "Attribution stitching from UTM, referrer, form submission, lead status, CRM outcome, and recruiting outcome.",
                "Revenue or placement attribution when integrated with CRM, billing, or recruiting modules.",
            ]
        ),
        para("Deployment And Operations Ideas", "h1"),
        table(
            [
                ["Idea", "Reason"],
                ["Pre-deploy smoke tests", "Automatically verify login-protected API health, render payload, form submission, sitemap, robots, domain, and CORS."],
                ["Rollback button", "Let operators restore the previous successful deployment with one action."],
                ["Environment lanes", "Separate draft, preview, staging, and production URLs per tenant."],
                ["Release notes generator", "Summarize pages changed, sections edited, AI content applied, domains touched, and integrations affected."],
                ["Domain diagnostics", "Explain DNS, SSL, proxy, and propagation issues in language a client can understand."],
            ],
            [1.75 * inch, 4.75 * inch],
        ),
        para("Governance, Safety, And Compliance", "h1"),
        bullets(
            [
                "Require approval for AI-generated legal, medical, financial, hiring, or regulated claims before publish.",
                "Add claim memory: every approved claim can link to source proof, while unsupported claims are flagged.",
                "Add data retention controls for leads, media, analytics events, and AI prompts/outputs.",
                "Keep secrets in a vault and store only references in integration config.",
                "Add tenant-level audit exports for enterprise customers and support investigations.",
            ]
        ),
        para("Suggested Roadmap", "h1"),
        table(
            [
                ["Horizon", "Focus", "Candidate work"],
                ["0-30 days", "Stability and polish", "Smoke tests, CORS/domain diagnostics, launch checklist, builder UX cleanup, documentation, super-admin hardening."],
                ["30-60 days", "Conversion loop", "Lead sync to MADLeads, form builder, analytics reports, A/B section variants, client review mode."],
                ["60-90 days", "Universe fabric", "Shared contact/client IDs, event bus, internal app installation, consent service, activity feed."],
                ["90+ days", "Agentic operations", "Research agent, lead response agent, campaign launcher, automated optimization recommendations, release governance."],
            ],
            [1.15 * inch, 1.55 * inch, 3.8 * inch],
        ),
        para("Top Ten Bets", "h1"),
        numbered(
            [
                "Make MADCreate the page and portal generator for every other MADProspects app.",
                "Build a shared Universe Contact and Client graph before integrations multiply.",
                "Turn generated sites into measurable lead engines by syncing forms and analytics into MADLeads.",
                "Give MADRecruiting one-click role microsites and application funnels.",
                "Add client review links and approval workflows to reduce back-and-forth.",
                "Create industry blueprint packs so first drafts feel immediately relevant.",
                "Add site health scoring and monthly AI reports to support recurring value.",
                "Centralize prompt governance and brand memory to protect quality at scale.",
                "Add deployment smoke tests, rollback, and diagnostics to protect trust.",
                "Commercialize bundles around launch, recruiting growth, lead generation, and agency operations.",
            ]
        ),
        callout("Bottom line", "The biggest opportunity is not merely making MADCreate a better website builder. It is making it the generative interface that turns business data from the whole MADProspects Universe into live, branded, measurable digital experiences.", "purple"),
    ]
    s += ideas_appendix()
    return s


def ideas_appendix():
    return [
        PageBreak(),
        para("Appendix A: Universe API Building Blocks", "h1"),
        table(
            [
                ["Building block", "Why it matters", "Fields to standardize"],
                ["Universe Workspace", "Keeps customers/accounts consistent across apps.", "id, name, billing owner, plan, status, region, created source."],
                ["Universe Client/Tenant", "Lets a client have sites, leads, recruiting jobs, campaigns, and invoices under one identity.", "id, workspaceId, legal name, trading name, domains, lifecycle, industry, owner."],
                ["Universe Contact", "Prevents duplicate people records.", "id, emails, phones, names, company, consent, source identities, dedupe confidence."],
                ["Universe Event", "Creates a shared activity stream.", "id, app, event type, actor, object, timestamp, metadata, correlation id."],
                ["Universe Consent", "Protects communication compliance.", "contact id, channel, purpose, status, source, timestamp, proof URL."],
                ["Universe Notification", "Coordinates email, SMS, WhatsApp, in-app, and task notifications.", "recipient, channel, template, payload, status, retry count."],
            ],
            [1.45 * inch, 2.35 * inch, 2.7 * inch],
        ),
        para("Appendix B: High-Value Integration Payloads", "h1"),
        table(
            [
                ["Payload", "Producer", "Consumer", "Typical content"],
                ["lead.created", "MADCreate", "MADLeads / CRM", "Tenant, page, form id, contact fields, message, UTM, referrer, consent, score hints."],
                ["candidate.applied", "MADCreate / MADRecruiting", "MADRecruiting", "Role id, candidate profile, CV/media links, screening answers, source page."],
                ["campaign.page_requested", "MADMarketing", "MADCreate", "Campaign brief, audience, offer, deadlines, tracking pixels, brand rules."],
                ["proposal.page_requested", "MADSales", "MADCreate", "Opportunity, pricing, case studies, stakeholder names, close date, acceptance CTA."],
                ["site.published", "MADCreate", "MADAnalytics / CRM", "Tenant, domain, site id, version, pages changed, deployment target, smoke-test result."],
                ["invoice.status_changed", "MADBilling", "MADCreate", "Workspace, plan, entitlement, billing status, grace period, feature limits."],
            ],
            [1.55 * inch, 1.35 * inch, 1.35 * inch, 2.25 * inch],
        ),
        para("Appendix C: Feature Backlog By Module", "h1"),
        table(
            [
                ["Module", "Enhancement ideas"],
                ["Onboarding", "Brief scoring, competitor import, brand voice capture, proof library, launch checklist, approval owner assignment."],
                ["AI Studio", "Prompt version diffing, output comparison, cost budget, apply preview, rollback target, generation annotations."],
                ["Builder", "Inline editing, drag ordering, component marketplace, saved blocks, keyboard shortcuts, section comments, responsive previews."],
                ["Themes", "Brand kit importer, contrast checker, font pairing suggestions, token history, global usage map."],
                ["Domains", "DNS wizard, Cloudflare automation, SSL status, propagation explanation, one-click retry, client-friendly instructions PDF."],
                ["Deployments", "Preview environments, smoke tests, release notes, rollback, deployment approvals, target health badges."],
                ["Integrations", "Credential vault, sync health, OAuth scopes, event subscriptions, per-integration logs, test connection button."],
                ["Analytics", "Funnels, section analytics, A/B testing, conversion attribution, client monthly report, anomaly alerts."],
                ["Leads", "Scoring, assignment, SLA timers, duplicate detection, enrichment, follow-up templates, MADLeads sync."],
                ["Admin", "Tenant impersonation with audit, feature-flag experiments, usage dashboards, support diagnostics, billing overrides."],
            ],
            [1.4 * inch, 5.1 * inch],
        ),
        para("Appendix D: MADRecruiting Integration Concepts", "h1"),
        bullets(
            [
                "Generate role-specific landing pages from job requisitions with location, salary, benefits, employer brand, and screening questions.",
                "Create candidate application forms that post directly into MADRecruiting with CV/media attachments stored through the shared media layer.",
                "Launch employer-brand microsites for clients with team, benefits, culture, open roles, testimonials, and candidate FAQs.",
                "Use MADCreate analytics to show which job pages convert, where candidates drop off, and which traffic sources produce qualified applicants.",
                "Add recruiter review mode so recruiters can approve page copy before publishing.",
                "Use AI to generate interview-prep pages or candidate nurture sequences after application.",
            ]
        ),
        para("Appendix E: MADLeads Integration Concepts", "h1"),
        bullets(
            [
                "Every MADCreate form submission should create or update a MADLeads lead with attribution and consent.",
                "MADLeads status changes should flow back to MADCreate analytics so pages can be optimized for qualified leads, not only raw form fills.",
                "MADLeads scoring can control dynamic CTA suggestions, lead magnets, or follow-up urgency in MADCreate.",
                "MADCreate can generate campaign landing pages from high-performing lead segments in MADLeads.",
                "Lead source quality can appear inside MADCreate site health and monthly reporting.",
            ]
        ),
        para("Appendix F: Experiment Library", "h1"),
        table(
            [
                ["Experiment", "Metric", "How MADCreate can support it"],
                ["Hero promise test", "CTA click-through", "Generate several headline/value-prop variants and rotate by experiment id."],
                ["Short vs long form", "Qualified submission rate", "Use form schema variants and send variant id into lead records."],
                ["Proof block order", "Scroll depth and conversion", "Swap testimonials, stats, case studies, and FAQs per page variant."],
                ["Pricing visibility", "Contact conversion and sales quality", "Compare visible pricing tiers with consultation-first CTA."],
                ["Recruiting benefit angle", "Candidate application completion", "Test salary-first, culture-first, growth-first, and flexibility-first sections."],
                ["Lead magnet", "Email capture rate", "Generate downloadable guide, checklist, calculator, or audit offer sections."],
            ],
            [1.6 * inch, 1.55 * inch, 3.35 * inch],
        ),
        para("Appendix G: Risk And Mitigation Matrix", "h1"),
        table(
            [
                ["Risk", "Mitigation"],
                ["Too many disconnected integrations", "Build the Universe event/contact/client fabric first, then add adapters."],
                ["AI publishes inaccurate claims", "Add approval gates, claim memory, source references, and regulated-industry warnings."],
                ["Operational complexity grows faster than support capacity", "Add diagnostics, health scores, smoke tests, and admin support tools early."],
                ["Secrets leak through integration config", "Store vault references only and redact all logs and PDFs."],
                ["Duplicate contacts across apps", "Introduce Universe Contact IDs, dedupe rules, and source identity linking."],
                ["Templates become stale", "Track conversion outcomes, review dates, industry pack ownership, and monthly freshness checks."],
                ["Database/provider migration confusion", "Resolve and document the authoritative DB engine before expanding production data flows."],
            ],
            [2.05 * inch, 4.45 * inch],
        ),
    ]


def build_pdf(path: Path, title: str, subtitle: str, story):
    doc = MadDoc(path, title, subtitle)
    doc.multiBuild(story)


def main():
    build_pdf(
        OUT_USER,
        "MADCreate User Manual",
        "A detailed operator guide for the AI-native website and business-system generator.",
        manual_story(),
    )
    build_pdf(
        OUT_IDEAS,
        "MADCreate Ideas",
        "Enhancement concepts and MADProspects Universe integration opportunities.",
        ideas_story(),
    )
    print(OUT_USER)
    print(OUT_IDEAS)


if __name__ == "__main__":
    main()
