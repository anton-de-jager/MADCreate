# `madcreate-init.md`

```md
# MADCreate â€” AI-Native Website & App Generation Platform
## Project Initialization Prompt for Claude Code

You are a principal-level AI software architect, UI/UX designer, systems engineer, DevOps engineer, SaaS product strategist and Angular/.NET Core expert.

Your task is to FULLY DESIGN, ARCHITECT, BUILD and INITIALIZE a production-ready AI-native SaaS platform called:

# MADCreate

Domains:
- Frontend App: https://madcreate.madleads.ai
- API: https://api.madcreate.madleads.ai
- MSSQL: mssql.madcreate.madleads.ai

This platform is built by MAD Prospects.

The purpose of MADCreate is to:
- Collect structured business requirements from clients
- Generate AI-native websites and business systems
- Dynamically render and host generated websites/apps
- Allow custom domains via DNS configuration
- Automatically deploy websites/apps
- Support white-label hosting
- Support multi-tenant SaaS architecture
- Generate visually stunning production-ready websites/apps
- Allow AI-assisted editing
- Become the "Shopify + Webflow + Lovable + V0 + Bolt + GoHighLevel + Framer" for SMEs

This is NOT a normal website builder.
This is an AI-native business operating system generator.

The application must feel:
- futuristic
- premium
- cinematic
- fast
- intelligent
- modular
- exciting
- insanely polished

IMPORTANT:
This project must be built as if it will become a globally scalable SaaS platform.

====================================================
TECH STACK
====================================================

Frontend:
- Angular 19
- Standalone Components
- Angular Signals
- TailwindCSS
- Angular Material
- Framer Motion equivalent animations where applicable
- RxJS
- SSR/Prerender where useful
- Dark mode + light mode
- Fully responsive

Backend:
- .NET Core 11
- MSSQL
- Entity Framework Core
- Redis
- BullMQ queues
- JWT auth
- Multi-tenant architecture

Infrastructure:
- Docker
- Docker Compose
- Cloudflare-ready
- NGINX reverse proxy support
- Dynamic domain routing
- Environment-based configuration
- FTP/SFTP deployment support
- Cloud deployment abstraction layer

AI:
- OpenAI integration abstraction
- Multi-model support
- AI prompt management
- AI website generation engine
- AI content generation
- AI section/page generation
- AI branding suggestions
- AI color palette generation
- AI layout generation
- AI SEO generation
- AI component generation

====================================================
CORE CONCEPT
====================================================

Users sign up and:
1. Create a workspace/company
2. Answer onboarding questions
3. Upload branding assets
4. Define requirements
5. Select integrations
6. Select visual style
7. Select desired pages
8. Select desired workflows
9. Generate site/app
10. Preview instantly
11. Publish to:
   - madcreate.madleads.ai/{slug}
   OR
   - custom domain

The platform dynamically generates and renders websites/apps from configuration and AI-generated structures.

====================================================
CRITICAL ARCHITECTURE REQUIREMENTS
====================================================

The system MUST be:
- modular
- extensible
- plugin-driven
- multi-tenant
- highly dynamic
- schema-driven
- component-driven
- AI-native from day one

DO NOT hardcode pages.

The system must dynamically render:
- layouts
- sections
- themes
- navigation
- forms
- workflows
- content blocks
- integrations
- AI assistants

====================================================
FRONTEND APPLICATION REQUIREMENTS
====================================================

Create:
- professional dashboard
- beautiful landing page
- onboarding wizard
- workspace selector
- AI generation studio
- live visual editor
- site preview engine
- deployment management
- analytics
- domain manager
- template marketplace
- integrations manager
- AI copilots
- asset manager
- page builder
- section builder
- reusable component library

The UI must feel:
- like Linear
- mixed with Vercel
- mixed with Framer
- mixed with Apple
- mixed with Arc browser
- mixed with futuristic SaaS interfaces

Use:
- glassmorphism
- smooth gradients
- subtle motion
- intelligent hover states
- ambient effects
- premium typography
- layered depth
- modular cards
- cinematic transitions

====================================================
DYNAMIC SITE ENGINE
====================================================

The system MUST dynamically render generated websites using:

https://madcreate.madleads.ai/{slug}

Examples:
- /acme-group
- /living-word-church
- /dr-smith-medical
- /mad-recruiting

The rendering engine must:
- load tenant configuration
- load theme
- load layout
- load sections
- load generated content
- render dynamically

Support:
- SSR
- SEO optimization
- sitemap generation
- robots.txt generation
- meta generation
- OpenGraph tags
- structured data

====================================================
CUSTOM DOMAIN SUPPORT
====================================================

The system must support:
- custom domains
- wildcard domains
- DNS configuration instructions
- Cloudflare integration readiness
- SSL automation readiness
- white-label deployments

Users should be able to:
- point domains via CNAME/A records
- map domains to tenant/site
- use subdomains
- use root domains

Examples:
- www.clientsite.com
- app.clientsite.com
- portal.clientsite.com

Implement:
- domain verification
- SSL status
- propagation checks
- DNS validation
- deployment status tracking

====================================================
WEBSITE / APP GENERATION ENGINE
====================================================

Build a powerful AI-native generation engine.

The onboarding system must collect:

BUSINESS INFO:
- company name
- slogan
- industry
- description
- target audience
- competitors
- goals
- services
- products
- locations

VISUAL STYLE:
- modern
- luxury
- corporate
- playful
- futuristic
- minimal
- brutalist
- glassmorphism
- cyberpunk
- premium SaaS
- church/ministry
- medical
- legal
- recruitment
- etc.

LAYOUT PREFERENCES:
- one-page
- multi-page
- app dashboard
- portal
- landing page
- ecommerce
- directory
- CRM
- booking system

INTEGRATIONS:
- PayFast
- WhatsApp
- Google Workspace
- Microsoft 365
- Xero
- Sage
- QuickBooks
- Zapier
- Make
- n8n
- Calendly
- Google Calendar
- Outlook
- Zoom
- Teams
- Firebase
- Supabase
- etc.

MANDATORY PAGES:
- home
- about
- services
- pricing
- contact
- blog
- portal
- dashboard
- login
- register
- booking
- etc.

FUNCTIONALITY:
- CRM
- bookings
- invoicing
- AI assistant
- forms
- workflows
- automation
- analytics
- chat
- notifications
- CMS
- knowledge base
- document storage
- task management

====================================================
AI GENERATION FEATURES
====================================================

The AI engine must generate:
- layouts
- page structures
- hero sections
- CTAs
- navigation
- branding suggestions
- typography pairings
- color systems
- content
- SEO metadata
- FAQ sections
- workflow recommendations
- database schemas
- admin panel suggestions

The AI should produce:
- JSON page schemas
- reusable section configs
- theme configs
- AI-generated copy
- design systems

====================================================
THEME ENGINE
====================================================

Build:
- dynamic theme engine
- live theme editing
- typography engine
- spacing system
- component token system
- animation token system

Allow:
- custom fonts
- Google Fonts
- uploaded fonts
- gradients
- shadows
- blur systems
- animations
- section spacing

====================================================
LIVE VISUAL BUILDER
====================================================

Implement:
- drag/drop sections
- live editing
- inline editing
- AI regenerate section
- AI improve copy
- AI generate image prompts
- undo/redo
- autosave
- responsive preview
- desktop/tablet/mobile preview

====================================================
DATABASE DESIGN
====================================================

Design a PROFESSIONAL scalable schema.

Include:
- users
- workspaces
- tenants
- sites
- domains
- pages
- sections
- layouts
- themes
- templates
- integrations
- deployments
- AI prompts
- AI generations
- media
- analytics
- audit logs
- permissions
- plans
- subscriptions
- environments

Use:
- Entity Framework Core
- proper indexing
- soft deletes
- timestamps
- audit trails

====================================================
MULTI-TENANT ARCHITECTURE
====================================================

Every tenant must have:
- isolated data
- isolated configuration
- isolated deployments
- isolated domains
- isolated AI context

Implement:
- tenant middleware
- tenant-aware queries
- tenant-aware storage
- tenant-aware rendering

====================================================
DEPLOYMENT ENGINE
====================================================

Build deployment pipeline abstraction.

Support:
- FTP
- SFTP
- Docker deployment
- static export
- SSR deployment
- Cloudflare Pages readiness
- Vercel readiness
- DigitalOcean readiness

IMPORTANT:
I will provide:
- FTP credentials
- SSH credentials
- hosting details
- API keys
later when required.

The system must already be architected for this.

====================================================
MEDIA / STORAGE
====================================================

Implement:
- media uploads
- optimized image delivery
- CDN readiness
- image compression
- AI-generated assets
- video support
- icon libraries

====================================================
ADMIN PANEL
====================================================

Create super admin functionality:
- manage tenants
- manage domains
- manage deployments
- view analytics
- manage AI usage
- manage plans
- manage billing
- manage templates
- manage feature flags

====================================================
ANALYTICS
====================================================

Implement:
- page views
- lead tracking
- conversion tracking
- deployment analytics
- AI usage analytics
- domain analytics
- tenant analytics

====================================================
AUTHENTICATION
====================================================

Implement:
- JWT auth
- refresh tokens
- email verification
- password reset
- magic links
- optional social auth
- RBAC

Roles:
- SuperAdmin
- WorkspaceOwner
- Admin
- Editor
- Viewer
- Client

====================================================
BILLING
====================================================

Architect support for:
- subscriptions
- monthly plans
- annual plans
- AI usage billing
- deployment billing
- custom domains
- add-ons

====================================================
REQUIRED OUTPUTS
====================================================

You must:
- scaffold FULL monorepo
- create backend
- create frontend
- create docker setup
- create Entity Framework Core schema
- create database migrations
- create dynamic rendering engine
- create AI generation architecture
- create theme engine
- create deployment architecture
- create dynamic routing
- create onboarding system
- create dashboard UI
- create landing page
- create reusable component system
- create beautiful animations
- create professional design system

====================================================
CRITICAL UI REQUIREMENTS
====================================================

The platform MUST feel:
- world-class
- addictive
- futuristic
- premium
- exciting
- intelligent
- cinematic

This must NOT feel:
- generic
- template-like
- bootstrap-ish
- corporate boring
- low effort

The user should feel:
"I am building the future."

====================================================
DESIGN INSPIRATION
====================================================

Use inspiration from:
- Vercel
- Linear
- Framer
- Arc Browser
- PayFast
- Notion
- Webflow
- Apple
- Raycast
- Superhuman

====================================================
CODE QUALITY
====================================================

Generate:
- production-ready code
- strongly typed code
- scalable architecture
- modular architecture
- reusable systems
- enterprise patterns
- clean folder structure
- environment abstraction
- proper logging
- proper error handling

====================================================
IMPORTANT EXECUTION RULES
====================================================

DO NOT:
- generate placeholders only
- stop halfway
- oversimplify architecture
- use old Angular syntax
- use NgModules
- use low-quality UI
- create generic admin templates

DO:
- build real systems
- build scalable foundations
- build reusable engines
- build visually stunning interfaces
- think like a world-class SaaS architect
- think like a product company
- think long-term

====================================================
FINAL GOAL
====================================================

The final system should allow MAD Prospects to:
- onboard clients rapidly
- generate beautiful websites/apps
- dynamically host them
- deploy them automatically
- scale to thousands of tenants
- evolve into a complete AI-native operating system platform

This platform should become:
"The operating system builder for modern SMEs."

BEGIN FULL IMPLEMENTATION NOW.
```
