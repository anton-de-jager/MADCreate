import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IntegrationsService } from './integrations.service';
import { InstallIntegrationDto } from './dto/install-integration.dto';
import type { JwtPayload } from '@madcreate/shared';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @ApiBearerAuth()
  @Get('catalog')
  catalog() {
    return this.integrations.catalog();
  }

  /** Rule-based suggestion: given a free-text industry, returns the catalog
   *  keys we'd recommend a tenant start with. No LLM call. */
  @ApiBearerAuth()
  @Get('suggest')
  suggest(@Query('industry') industry?: string) {
    return { industry: industry ?? null, keys: suggestForIndustry(industry) };
  }

  @ApiBearerAuth()
  @Get('installed')
  installed(@CurrentUser() user: JwtPayload, @Query('tenantId') tenantId: string) {
    return this.integrations.installed(user.sub, tenantId);
  }

  @ApiBearerAuth()
  @Post('install')
  install(
    @CurrentUser() user: JwtPayload,
    @Query('tenantId') tenantId: string,
    @Body() dto: InstallIntegrationDto,
  ) {
    return this.integrations.install(user.sub, tenantId, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  uninstall(@CurrentUser() user: JwtPayload, @Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.integrations.uninstall(user.sub, tenantId, id);
  }
}

// ── industry → integration-keys rules ─────────────────────────────
// First matching pattern wins. Patterns are case-insensitive substrings of
// the tenant's free-text industry input. Catch-all default at the bottom.
const INDUSTRY_RULES: Array<{ match: RegExp; keys: string[] }> = [
  { match: /restaur|cafe|food|hospital(?!ity)/i, keys: ['stripe', 'payfast', 'calendly', 'whatsapp', 'google_maps', 'mailchimp', 'shopify', 'twilio'] },
  { match: /retail|shop|store|ecomm|e-?commerce/i, keys: ['stripe', 'paypal', 'shopify', 'woocommerce', 'klaviyo', 'mailchimp', 'shippo', 'google_analytics', 'meta_ads'] },
  { match: /saas|software|tech|developer/i, keys: ['stripe', 'paddle', 'sendgrid', 'posthog', 'mixpanel', 'intercom', 'auth0', 'openai', 'anthropic', 'cloudflare', 'vercel'] },
  { match: /church|ministry|community|nonprofit|charity/i, keys: ['payfast', 'paypal', 'mailchimp', 'whatsapp', 'youtube', 'zoom', 'google_calendar', 'google_maps'] },
  { match: /law|legal|attorney|advocate/i, keys: ['docusign', 'calendly', 'stripe', 'xero', 'google_workspace', 'hubspot', 'auth0'] },
  { match: /medical|clinic|doctor|health|dental/i, keys: ['calendly', 'stripe', 'whatsapp', 'twilio', 'google_maps', 'onetrust', 'auth0'] },
  { match: /agency|consult|freelanc/i, keys: ['stripe', 'calendly', 'hubspot', 'mailchimp', 'docusign', 'xero', 'zapier', 'google_workspace'] },
  { match: /education|school|tutor|cours/i, keys: ['stripe', 'calendly', 'zoom', 'sendgrid', 'mailchimp', 'youtube', 'whatsapp'] },
  { match: /real ?estate|propert/i, keys: ['google_maps', 'mapbox', 'whatsapp', 'docusign', 'mailchimp', 'hubspot', 'calendly'] },
  { match: /fitness|gym|wellness/i, keys: ['stripe', 'calendly', 'twilio', 'mailchimp', 'whatsapp', 'klaviyo'] },
  { match: /event|wedding|venue/i, keys: ['stripe', 'calendly', 'mailchimp', 'twilio', 'whatsapp', 'google_maps', 'youtube'] },
  { match: /recruit|hiring|\bhr\b|talent/i, keys: ['greenhouse', 'lever', 'bamboohr', 'workable', 'linkedin_ads', 'mailchimp', 'calendly'] },
  { match: /logistics|shipping|transport|courier/i, keys: ['shippo', 'easypost', 'dhl', 'fedex', 'ups', 'bobgo', 'google_maps', 'whatsapp'] },
];

function suggestForIndustry(industry?: string): string[] {
  if (!industry) {
    return ['stripe', 'mailchimp', 'sendgrid', 'whatsapp', 'google_analytics', 'calendly', 'google_maps'];
  }
  for (const r of INDUSTRY_RULES) {
    if (r.match.test(industry)) return r.keys;
  }
  return ['stripe', 'mailchimp', 'sendgrid', 'whatsapp', 'google_analytics', 'hubspot'];
}
