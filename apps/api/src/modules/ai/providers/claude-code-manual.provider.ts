import { Injectable } from '@nestjs/common';
import type { AIProvider, AIProviderCompleteOptions, AIProviderCompleteResult } from './provider.interface';

/**
 * Builds a self-contained Claude Code prompt instead of calling any LLM API.
 * The tenant copies the prompt, runs it in their own `claude` CLI session,
 * and pastes the JSON output back. The AIGeneration row sits at
 * AWAITING_INPUT until that paste-back arrives.
 *
 * The prompt is opinionated about output shape so the MADCreate renderer can
 * consume the result directly — no further AI calls, no post-processing.
 */
@Injectable()
export class ClaudeCodeManualProvider implements AIProvider {
  readonly name = 'claude-code-manual' as const;
  readonly isManual = true;

  async complete(opts: AIProviderCompleteOptions): Promise<AIProviderCompleteResult> {
    // The userPrompt arriving here is the rendered template from AiService —
    // it already contains the tenant's onboarding answers as a JSON blob.
    // We wrap that in a complete Claude Code instruction set.
    const prompt = buildPrompt(opts.userPrompt);
    return { raw: prompt, tokensIn: 0, tokensOut: 0 };
  }
}

const SECTION_KINDS = [
  'hero',
  'features',
  'pricing',
  'testimonials',
  'stats',
  'faq',
  'cta',
  'contact',
  'generic',
] as const;

function buildPrompt(userContext: string): string {
  return `You are generating a complete website specification for the MADCreate platform.
Output ONE JSON object, in a single \`\`\`json fenced block. No prose before or after.

# Context (tenant answers)
${userContext}

# Required JSON shape

\`\`\`ts
{
  "brandKit": {
    "name": string,                 // company / brand name
    "tagline": string,               // < 80 chars
    "mission": string,               // 1–2 sentence mission statement
    "voice": string,                 // tone description, e.g. "confident, futuristic, premium"
    "logoConcept": string,           // short description of the proposed logo
    "colors": {
      "primary":    string,          // hex, e.g. "#7C5CFF"
      "secondary":  string,
      "accent":     string,
      "background": string,
      "surface":    string,
      "foreground": string,
      "muted":      string
    },
    "typography": {
      "headingFamily": string,       // a real web font, e.g. "Inter"
      "bodyFamily":    string,
      "headingWeights": number[],    // e.g. [600, 800]
      "bodyWeights":    number[]
    }
  },
  "site": {
    "name": string,
    "navigation": {
      "items": Array<{ "label": string, "href": string }>   // top-nav links
    },
    "settings": {
      "metaTitle": string,
      "metaDescription": string,
      "keywords": string[],
      "ogTitle": string,
      "ogDescription": string
    },
    "pages": Array<{
      "slug": string,                // url-safe, e.g. "home" | "about" | "pricing"
      "title": string,
      "metaTitle": string,
      "metaDescription": string,
      "sections": Array<{
        "kind": ${SECTION_KINDS.map((k) => `"${k}"`).join(' | ')},
        "props": object              // shape depends on kind — see below
      }>
    }>
  },
  "integrationNotes": Array<{
    "key": string,                   // integration identifier from the tenant's selection
    "where": string,                 // page slug or section where it slots in
    "purpose": string                // 1-sentence description of how it's used
  }>
}
\`\`\`

# Section kinds and their props

- **hero** — \`{ heading, subheading, primaryCta: { label, href }, secondaryCta?: { label, href }, eyebrow?, mediaUrl? }\`
- **features** — \`{ eyebrow?, heading, subheading?, items: Array<{ icon?, title, body }> }\` (3–6 items)
- **pricing** — \`{ heading, plans: Array<{ name, priceLabel, period, features: string[], cta: { label, href }, featured?: boolean }> }\` (2–4 plans)
- **testimonials** — \`{ heading, items: Array<{ quote, author, role, avatarUrl? }> }\` (2–6 items)
- **stats** — \`{ heading?, items: Array<{ value, label }> }\` (3–4 items)
- **faq** — \`{ heading, items: Array<{ q, a }> }\` (4–8 items)
- **cta** — \`{ heading, body?, primaryCta: { label, href }, secondaryCta?: { label, href } }\`
- **contact** — \`{ heading, body?, email?, phone?, address?, formFields?: Array<{ name, label, type, required? }> }\`
- **generic** — fallback. \`{ heading?, body?, items?, anything else }\` — used when nothing better fits.

# Rules

1. Use the tenant's industry, audience and brand voice to drive every word of copy. Do NOT use placeholder text like "Lorem ipsum" or "Your tagline here".
2. The brandKit.colors hex values must be coherent — primary should pair with accent. Background/surface/foreground/muted are for dark or light mode depending on the tenant's preference; pick one mode and commit.
3. The brandKit.typography must use real Google Fonts (Inter, Manrope, Sora, Space Grotesk, Plus Jakarta Sans, Playfair Display, DM Serif, etc.).
4. Every page must have at least 2 sections. The home page must have a \`hero\` as its first section.
5. \`navigation.items[].href\` must match a real page slug from \`pages[]\`, prefixed with \`/\`. The home page is \`/\`.
6. If the tenant selected integrations, include realistic \`integrationNotes\` showing where each integration plugs in (e.g. Stripe on /pricing, WhatsApp on /contact, Calendly on /booking). Mention them in the section copy where relevant.
7. Keep the JSON valid. All strings JSON-escape internal quotes. No comments. No trailing commas.
8. Output ONLY the \`\`\`json block. No commentary, no preamble.

Begin.`;
}
