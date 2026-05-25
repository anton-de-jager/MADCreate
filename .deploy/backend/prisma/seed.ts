// MADCreate — database seed
// Idempotent: safe to run multiple times. Uses upsert by stable keys.

// Load .env explicitly so PrismaClient sees DATABASE_URL when invoked via tsx
// on the production server (tsx's ESM loader doesn't trigger Prisma's
// auto-dotenv path the way the prisma CLI does).
import 'dotenv/config';
import { Prisma, PrismaClient, Role, TemplateVisibility, IntegrationCategory, AIProvider, AIGenerationKind } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// MUST match the algorithm used by AuthService — argon2 PHC strings.
// scrypt-style "salt:hash" strings throw "pchstr must contain a $ as first char"
// inside argon2.verify() at login time.
async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

async function seedPlans() {
  const plans = [
    {
      code: 'free',
      name: 'Free',
      description: 'Get started with one site and AI-assisted generation.',
      priceMonthlyUsd: '0',
      priceAnnualUsd: '0',
      trialDays: 0,
      limits: {
        tenants: 1,
        sites: 1,
        aiTokensPerMonth: 50_000,
        deploymentsPerMonth: 5,
        customDomains: 0,
        members: 1,
      },
      features: ['ai_generation_basic', 'subdomain_hosting'],
      sortOrder: 0,
    },
    {
      code: 'starter',
      name: 'Starter',
      description: 'For freelancers shipping a handful of sites.',
      priceMonthlyUsd: '29',
      priceAnnualUsd: '290',
      trialDays: 14,
      limits: {
        tenants: 3,
        sites: 3,
        aiTokensPerMonth: 500_000,
        deploymentsPerMonth: 50,
        customDomains: 1,
        members: 3,
      },
      features: ['ai_generation_basic', 'custom_domain', 'visual_builder'],
      sortOrder: 1,
    },
    {
      code: 'growth',
      name: 'Growth',
      description: 'For agencies and growing SMEs.',
      priceMonthlyUsd: '99',
      priceAnnualUsd: '990',
      trialDays: 14,
      limits: {
        tenants: 15,
        sites: 30,
        aiTokensPerMonth: 3_000_000,
        deploymentsPerMonth: 500,
        customDomains: 10,
        members: 10,
      },
      features: ['ai_generation_pro', 'custom_domain', 'visual_builder', 'white_label_lite', 'integrations'],
      sortOrder: 2,
    },
    {
      code: 'scale',
      name: 'Scale',
      description: 'For high-volume operators and white-label resellers.',
      priceMonthlyUsd: '299',
      priceAnnualUsd: '2990',
      trialDays: 14,
      limits: {
        tenants: 100,
        sites: 300,
        aiTokensPerMonth: 20_000_000,
        deploymentsPerMonth: 5000,
        customDomains: 100,
        members: 50,
      },
      features: ['ai_generation_pro', 'custom_domain', 'visual_builder', 'white_label', 'integrations', 'priority_support'],
      sortOrder: 3,
    },
    {
      code: 'enterprise',
      name: 'Enterprise',
      description: 'Custom pricing — dedicated infra, SSO, SLA.',
      priceMonthlyUsd: '0',
      priceAnnualUsd: '0',
      trialDays: 0,
      limits: {
        tenants: -1,
        sites: -1,
        aiTokensPerMonth: -1,
        deploymentsPerMonth: -1,
        customDomains: -1,
        members: -1,
      },
      features: ['everything', 'sso', 'dedicated_infra', 'sla'],
      sortOrder: 4,
      isPublic: false,
    },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        description: p.description,
        priceMonthlyUsd: p.priceMonthlyUsd,
        priceAnnualUsd: p.priceAnnualUsd,
        trialDays: p.trialDays,
        limits: p.limits,
        features: p.features,
        sortOrder: p.sortOrder,
        isPublic: p.isPublic ?? true,
      },
      create: {
        code: p.code,
        name: p.name,
        description: p.description,
        priceMonthlyUsd: p.priceMonthlyUsd,
        priceAnnualUsd: p.priceAnnualUsd,
        trialDays: p.trialDays,
        limits: p.limits,
        features: p.features,
        sortOrder: p.sortOrder,
        isPublic: p.isPublic ?? true,
      },
    });
  }
  console.log(`✓ Seeded ${plans.length} plans`);
}

// Maps integration key → Simple Icons slug. Most map 1:1 to the key; the
// exceptions live here. Keys not in this map fall back to lowercase(key).
// Keys that explicitly resolve to null have no Simple Icons asset and render
// as the generic placeholder in the wizard.
const SIMPLEICONS_SLUG: Record<string, string | null> = {
  // PAYMENT
  authorize_net: 'authorize', stripe: 'stripe', paypal: 'paypal', paddle: 'paddle',
  lemon_squeezy: 'lemonsqueezy', adyen: 'adyen', square: 'square', braintree: 'braintree',
  mollie: 'mollie', wise: 'wise', payfast: null, yoco: null, ozow: null,
  paystack: null, flutterwave: null, coinbase_commerce: 'coinbase', binance_pay: 'binance',
  // CRM
  hubspot: 'hubspot', salesforce: 'salesforce', pipedrive: 'pipedrive', zoho_crm: 'zoho',
  monday_crm: 'monday', close: null, freshsales: 'freshworks', copper: null,
  // MARKETING
  mailchimp: 'mailchimp', klaviyo: 'klaviyo', activecampaign: 'activecampaign', brevo: 'brevo', convertkit: 'convertkit',
  // EMAIL
  sendgrid: 'maildotru', mailgun: 'mailgun', amazon_ses: 'amazonsimpleemailservice', postmark: null, resend: 'resend',
  // SMS_VOICE
  twilio: 'twilio', messagebird: null, vonage: 'vonage', plivo: null, telnyx: null,
  // SOCIAL
  meta_dev: 'meta', linkedin_dev: 'linkedin', tiktok_dev: 'tiktok', pinterest_dev: 'pinterest',
  snapchat_dev: 'snapchat', x_dev: 'x', reddit_dev: 'reddit',
  // ADS
  google_ads: 'googleads', meta_ads: 'meta', tiktok_ads: 'tiktok', linkedin_ads: 'linkedin',
  // AUTH
  auth0: 'auth0', clerk: 'clerk', okta: 'okta', firebase_auth: 'firebase',
  supabase_auth: 'supabase', keycloak: 'keycloak',
  // DOCUMENTS
  docusign: 'docusign', adobe_sign: 'adobeacrobatreader', dropbox: 'dropbox',
  box: 'box', google_drive: 'googledrive', onedrive: 'microsoftonedrive',
  // ANALYTICS
  google_analytics: 'googleanalytics', mixpanel: 'mixpanel', posthog: 'posthog',
  amplitude: 'amplitude', hotjar: 'hotjar', ms_clarity: 'microsoft',
  // SUPPORT
  zendesk: 'zendesk', intercom: 'intercom', freshdesk: 'freshworks', helpscout: null, crisp: null,
  // ECOMMERCE
  shopify: 'shopify', woocommerce: 'woocommerce', bigcommerce: 'bigcommerce', magento: 'magento',
  // SHIPPING
  shippo: null, easypost: null, dhl: 'dhl', fedex: 'fedex', ups: 'ups', bobgo: null,
  // CMS
  wordpress: 'wordpress', contentful: 'contentful', sanity: 'sanity', strapi: 'strapi', directus: 'directus',
  // SEARCH
  algolia: 'algolia', elasticsearch: 'elasticsearch', meilisearch: 'meilisearch',
  // CLOUD
  cloudflare: 'cloudflare', vercel: 'vercel', netlify: 'netlify', digitalocean: 'digitalocean',
  aws: 'amazonwebservices', gcp: 'googlecloud', azure: 'microsoftazure',
  // AI
  openai: 'openai', anthropic: 'anthropic', google_gemini: 'googlegemini', mistral: 'mistralai',
  cohere: null, perplexity: 'perplexity', deepseek: null,
  // VECTOR
  pinecone: null, weaviate: null, qdrant: null, chroma: null,
  // AGENT
  langchain: 'langchain', crewai: null, autogen: null,
  // MEDIA
  mux: null, cloudinary: 'cloudinary', vimeo: 'vimeo', youtube: 'youtube', agora: null,
  // HR
  greenhouse: null, lever: null, bamboohr: 'bamboo', workable: null,
  // LEGAL
  onetrust: null, termly: null, cookiebot: null,
  // MAPS
  google_maps: 'googlemaps', mapbox: 'mapbox', openstreetmap: 'openstreetmap',
  // COMMUNICATION
  whatsapp: 'whatsapp', zoom: 'zoom', teams: 'microsoftteams',
  // PRODUCTIVITY
  google_workspace: 'google', microsoft_365: 'microsoft',
  // ACCOUNTING
  xero: 'xero', sage: 'sage', quickbooks: 'quickbooks',
  // AUTOMATION
  zapier: 'zapier', make: 'make', n8n: 'n8n',
  // CALENDAR
  calendly: 'calendly', google_calendar: 'googlecalendar', outlook: null,
  // STORAGE
  firebase: 'firebase', supabase: 'supabase',
};

// Keys flagged as "popular" — shown in a featured row at the top of the wizard.
// Chosen to represent the most-commonly-needed across SME verticals.
const POPULAR_KEYS = new Set([
  'stripe', 'paypal', 'payfast', 'hubspot', 'mailchimp', 'sendgrid', 'twilio',
  'whatsapp', 'google_analytics', 'openai', 'anthropic', 'shopify',
  'docusign', 'calendly', 'cloudflare', 'google_maps',
]);

// Tiny JSON-schema-ish config for each integration. The /app/integrations
// page consumes this to render setup forms. Most are just an API key; a
// few need extra fields (region, secret, etc.).
function configSchemaFor(key: string): unknown {
  const apiKey = { fields: [{ name: 'apiKey', label: 'API key', type: 'password', required: true }] };
  const apiKeyPlus = (extra: Array<{ name: string; label: string; type?: string; required?: boolean }>) =>
    ({ fields: [{ name: 'apiKey', label: 'API key', type: 'password', required: true }, ...extra] });
  const map: Record<string, unknown> = {
    stripe: apiKeyPlus([{ name: 'webhookSecret', label: 'Webhook signing secret', type: 'password' }]),
    paypal: apiKeyPlus([{ name: 'clientId', label: 'Client ID' }, { name: 'mode', label: 'Mode (live|sandbox)' }]),
    payfast: { fields: [
      { name: 'merchantId', label: 'Merchant ID', required: true },
      { name: 'merchantKey', label: 'Merchant key', required: true },
      { name: 'passphrase', label: 'Passphrase', type: 'password' },
      { name: 'sandbox', label: 'Sandbox mode', type: 'boolean' },
    ] },
    twilio: { fields: [
      { name: 'accountSid', label: 'Account SID', required: true },
      { name: 'authToken', label: 'Auth token', type: 'password', required: true },
      { name: 'fromNumber', label: 'From number (E.164)' },
    ] },
    whatsapp: { fields: [
      { name: 'phoneNumberId', label: 'Phone number ID', required: true },
      { name: 'businessAccountId', label: 'Business account ID', required: true },
      { name: 'accessToken', label: 'Access token', type: 'password', required: true },
      { name: 'webhookVerifyToken', label: 'Webhook verify token', type: 'password' },
    ] },
    aws: { fields: [
      { name: 'accessKeyId', label: 'Access key ID', required: true },
      { name: 'secretAccessKey', label: 'Secret access key', type: 'password', required: true },
      { name: 'region', label: 'Region', required: true },
    ] },
    sendgrid: apiKey, mailgun: apiKey, postmark: apiKey, resend: apiKey, amazon_ses: apiKey,
    openai: apiKey, anthropic: apiKey, google_gemini: apiKey, mistral: apiKey, cohere: apiKey,
    perplexity: apiKey, deepseek: apiKey, pinecone: apiKey, weaviate: apiKey, qdrant: apiKey,
    cloudflare: apiKeyPlus([{ name: 'zoneId', label: 'Zone ID' }, { name: 'accountId', label: 'Account ID' }]),
    vercel: apiKeyPlus([{ name: 'teamId', label: 'Team ID' }]),
    digitalocean: apiKey, netlify: apiKey,
    shopify: apiKeyPlus([{ name: 'shopDomain', label: 'Shop domain (my-store.myshopify.com)', required: true }]),
    woocommerce: apiKeyPlus([{ name: 'consumerSecret', label: 'Consumer secret', type: 'password' }, { name: 'storeUrl', label: 'Store URL' }]),
    docusign: apiKeyPlus([{ name: 'accountId', label: 'Account ID' }, { name: 'integrationKey', label: 'Integration key' }]),
    google_maps: apiKey, mapbox: apiKey,
    google_analytics: { fields: [{ name: 'measurementId', label: 'Measurement ID (G-...)', required: true }] },
    posthog: apiKeyPlus([{ name: 'projectId', label: 'Project ID' }, { name: 'host', label: 'Host URL' }]),
    mailchimp: apiKeyPlus([{ name: 'listId', label: 'Audience ID' }, { name: 'serverPrefix', label: 'Server prefix (us6, eu1…)' }]),
    klaviyo: apiKey, hubspot: apiKey, salesforce: apiKey, calendly: apiKey,
    zapier: { fields: [{ name: 'webhookUrl', label: 'Catch hook URL', required: true }] },
    n8n: { fields: [{ name: 'webhookUrl', label: 'Webhook URL', required: true }, { name: 'apiKey', label: 'API key', type: 'password' }] },
    xero: apiKey, quickbooks: apiKey,
  };
  // Default: a single API key is plenty for the long tail.
  return map[key] ?? apiKey;
}

async function seedIntegrationCatalog() {
  const items: Array<{
    key: string;
    name: string;
    category: IntegrationCategory;
    description: string;
  }> = [
    // ── PAYMENT / FINTECH ───────────────────────────────────────
    { key: 'stripe',            name: 'Stripe',            category: 'PAYMENT', description: 'Global card payments and subscriptions.' },
    { key: 'paypal',            name: 'PayPal',            category: 'PAYMENT', description: 'Worldwide payments + checkout.' },
    { key: 'paddle',            name: 'Paddle',            category: 'PAYMENT', description: 'Merchant of record for SaaS billing + tax.' },
    { key: 'lemon_squeezy',     name: 'Lemon Squeezy',     category: 'PAYMENT', description: 'MoR for digital products + subscriptions.' },
    { key: 'adyen',             name: 'Adyen',             category: 'PAYMENT', description: 'Enterprise payment platform.' },
    { key: 'square',            name: 'Square',            category: 'PAYMENT', description: 'POS + online payments.' },
    { key: 'braintree',         name: 'Braintree',         category: 'PAYMENT', description: 'PayPal-owned payment gateway.' },
    { key: 'authorize_net',     name: 'Authorize.net',     category: 'PAYMENT', description: 'Long-standing US payment gateway.' },
    { key: 'mollie',            name: 'Mollie',            category: 'PAYMENT', description: 'European payment processor.' },
    { key: 'wise',              name: 'Wise',              category: 'PAYMENT', description: 'International transfers + multi-currency accounts.' },
    { key: 'payfast',           name: 'PayFast',           category: 'PAYMENT', description: 'South African payment gateway.' },
    { key: 'yoco',              name: 'Yoco',              category: 'PAYMENT', description: 'SA POS and online payments.' },
    { key: 'ozow',              name: 'Ozow',              category: 'PAYMENT', description: 'Instant EFT payments (SA).' },
    { key: 'paystack',          name: 'Paystack',          category: 'PAYMENT', description: 'African payment infrastructure.' },
    { key: 'flutterwave',       name: 'Flutterwave',       category: 'PAYMENT', description: 'Pan-African payment gateway.' },
    { key: 'coinbase_commerce', name: 'Coinbase Commerce', category: 'PAYMENT', description: 'Accept crypto payments.' },
    { key: 'binance_pay',       name: 'Binance Pay',       category: 'PAYMENT', description: 'Crypto payments via Binance.' },

    // ── CRM / SALES ────────────────────────────────────────────
    { key: 'hubspot',       name: 'HubSpot',       category: 'CRM', description: 'CRM, marketing, sales hub.' },
    { key: 'salesforce',    name: 'Salesforce',    category: 'CRM', description: 'Enterprise CRM platform.' },
    { key: 'pipedrive',     name: 'Pipedrive',     category: 'CRM', description: 'Sales-pipeline CRM.' },
    { key: 'zoho_crm',      name: 'Zoho CRM',      category: 'CRM', description: 'CRM in the Zoho suite.' },
    { key: 'monday_crm',    name: 'Monday CRM',    category: 'CRM', description: 'Sales CRM on monday.com.' },
    { key: 'close',         name: 'Close',         category: 'CRM', description: 'Inside-sales CRM.' },
    { key: 'freshsales',    name: 'Freshsales',    category: 'CRM', description: 'Freshworks CRM.' },
    { key: 'copper',        name: 'Copper',        category: 'CRM', description: 'CRM for Google Workspace.' },

    // ── MARKETING (campaigns + automation) ─────────────────────
    { key: 'mailchimp',       name: 'Mailchimp',       category: 'MARKETING', description: 'Email campaigns + automations.' },
    { key: 'klaviyo',         name: 'Klaviyo',         category: 'MARKETING', description: 'E-commerce email + SMS.' },
    { key: 'activecampaign',  name: 'ActiveCampaign',  category: 'MARKETING', description: 'Email + marketing automation.' },
    { key: 'brevo',           name: 'Brevo',           category: 'MARKETING', description: 'Email, SMS, chat (Sendinblue).' },
    { key: 'convertkit',      name: 'ConvertKit',      category: 'MARKETING', description: 'Email for creators.' },

    // ── EMAIL (transactional delivery) ─────────────────────────
    { key: 'sendgrid',  name: 'SendGrid',  category: 'EMAIL', description: 'Transactional + bulk email.' },
    { key: 'mailgun',   name: 'Mailgun',   category: 'EMAIL', description: 'Developer-first email API.' },
    { key: 'amazon_ses',name: 'Amazon SES',category: 'EMAIL', description: 'AWS Simple Email Service.' },
    { key: 'postmark',  name: 'Postmark',  category: 'EMAIL', description: 'Fast transactional email.' },
    { key: 'resend',    name: 'Resend',    category: 'EMAIL', description: 'Modern email for developers.' },

    // ── SMS / VOICE / TELEPHONY ────────────────────────────────
    { key: 'twilio',      name: 'Twilio',      category: 'SMS_VOICE', description: 'SMS, voice, WhatsApp, OTP.' },
    { key: 'messagebird', name: 'MessageBird', category: 'SMS_VOICE', description: 'Omnichannel comms (Bird).' },
    { key: 'vonage',      name: 'Vonage',      category: 'SMS_VOICE', description: 'SMS + voice APIs.' },
    { key: 'plivo',       name: 'Plivo',       category: 'SMS_VOICE', description: 'Cloud communications API.' },
    { key: 'telnyx',      name: 'Telnyx',      category: 'SMS_VOICE', description: 'Programmable voice + SMS.' },

    // ── SOCIAL (publishing, content) ───────────────────────────
    { key: 'meta_dev',      name: 'Meta for Developers',    category: 'SOCIAL', description: 'Facebook + Instagram Graph APIs.' },
    { key: 'linkedin_dev',  name: 'LinkedIn Marketing Dev', category: 'SOCIAL', description: 'LinkedIn publishing + audience APIs.' },
    { key: 'tiktok_dev',    name: 'TikTok for Developers',  category: 'SOCIAL', description: 'TikTok publishing + login + data.' },
    { key: 'pinterest_dev', name: 'Pinterest Developers',   category: 'SOCIAL', description: 'Pin publishing + board APIs.' },
    { key: 'snapchat_dev',  name: 'Snapchat for Developers',category: 'SOCIAL', description: 'Snap Kit + ad APIs.' },
    { key: 'x_dev',         name: 'X Developer Platform',   category: 'SOCIAL', description: 'X (Twitter) APIs.' },
    { key: 'reddit_dev',    name: 'Reddit Developer',       category: 'SOCIAL', description: 'Reddit publishing + data APIs.' },

    // ── ADS (paid acquisition) ─────────────────────────────────
    { key: 'google_ads',    name: 'Google Ads',     category: 'ADS', description: 'Search, display, YouTube ads.' },
    { key: 'meta_ads',      name: 'Meta Marketing', category: 'ADS', description: 'Facebook + Instagram ads.' },
    { key: 'tiktok_ads',    name: 'TikTok Ads',     category: 'ADS', description: 'TikTok ad campaigns.' },
    { key: 'linkedin_ads',  name: 'LinkedIn Ads',   category: 'ADS', description: 'B2B advertising.' },

    // ── AUTHENTICATION / IDENTITY ──────────────────────────────
    { key: 'auth0',          name: 'Auth0',           category: 'AUTH', description: 'Identity-as-a-Service (Okta).' },
    { key: 'clerk',          name: 'Clerk',           category: 'AUTH', description: 'User management for modern apps.' },
    { key: 'okta',           name: 'Okta',            category: 'AUTH', description: 'Enterprise identity + SSO.' },
    { key: 'firebase_auth',  name: 'Firebase Auth',   category: 'AUTH', description: 'Google identity platform.' },
    { key: 'supabase_auth',  name: 'Supabase Auth',   category: 'AUTH', description: 'Postgres-backed auth.' },
    { key: 'keycloak',       name: 'Keycloak',        category: 'AUTH', description: 'Self-hosted SSO + IAM.' },

    // ── DOCUMENTS / FILES / E-SIGNATURE ────────────────────────
    { key: 'docusign',     name: 'DocuSign',     category: 'DOCUMENTS', description: 'E-signature + agreement cloud.' },
    { key: 'adobe_sign',   name: 'Adobe Sign',   category: 'DOCUMENTS', description: 'Adobe e-signature.' },
    { key: 'dropbox',      name: 'Dropbox',      category: 'DOCUMENTS', description: 'File storage + sharing.' },
    { key: 'box',          name: 'Box',          category: 'DOCUMENTS', description: 'Enterprise content cloud.' },
    { key: 'google_drive', name: 'Google Drive', category: 'DOCUMENTS', description: 'Files in Google Workspace.' },
    { key: 'onedrive',     name: 'OneDrive',     category: 'DOCUMENTS', description: 'Files in Microsoft 365.' },

    // ── ANALYTICS / TRACKING ───────────────────────────────────
    { key: 'google_analytics', name: 'Google Analytics', category: 'ANALYTICS', description: 'GA4 web analytics.' },
    { key: 'mixpanel',         name: 'Mixpanel',         category: 'ANALYTICS', description: 'Product analytics.' },
    { key: 'posthog',          name: 'PostHog',          category: 'ANALYTICS', description: 'Open-source product analytics.' },
    { key: 'amplitude',        name: 'Amplitude',        category: 'ANALYTICS', description: 'Product analytics + experimentation.' },
    { key: 'hotjar',           name: 'Hotjar',           category: 'ANALYTICS', description: 'Heatmaps + session recordings.' },
    { key: 'ms_clarity',       name: 'Microsoft Clarity',category: 'ANALYTICS', description: 'Free heatmaps + recordings.' },

    // ── CUSTOMER SUPPORT ───────────────────────────────────────
    { key: 'zendesk',   name: 'Zendesk',   category: 'SUPPORT', description: 'Ticketing + helpdesk.' },
    { key: 'intercom',  name: 'Intercom',  category: 'SUPPORT', description: 'Customer messaging + AI chatbot.' },
    { key: 'freshdesk', name: 'Freshdesk', category: 'SUPPORT', description: 'Freshworks helpdesk.' },
    { key: 'helpscout', name: 'Help Scout',category: 'SUPPORT', description: 'Email-first helpdesk.' },
    { key: 'crisp',     name: 'Crisp',     category: 'SUPPORT', description: 'Multichannel business messenger.' },

    // ── E-COMMERCE PLATFORMS ───────────────────────────────────
    { key: 'shopify',      name: 'Shopify',         category: 'ECOMMERCE', description: 'Storefront, orders, inventory.' },
    { key: 'woocommerce',  name: 'WooCommerce',     category: 'ECOMMERCE', description: 'WordPress e-commerce.' },
    { key: 'bigcommerce',  name: 'BigCommerce',     category: 'ECOMMERCE', description: 'Headless commerce.' },
    { key: 'magento',      name: 'Adobe Commerce',  category: 'ECOMMERCE', description: 'Magento Open Source.' },

    // ── SHIPPING / LOGISTICS ───────────────────────────────────
    { key: 'shippo',    name: 'Shippo',    category: 'SHIPPING', description: 'Multi-carrier shipping API.' },
    { key: 'easypost',  name: 'EasyPost',  category: 'SHIPPING', description: 'Shipping API across carriers.' },
    { key: 'dhl',       name: 'DHL',       category: 'SHIPPING', description: 'Global shipping APIs.' },
    { key: 'fedex',     name: 'FedEx',     category: 'SHIPPING', description: 'FedEx web services.' },
    { key: 'ups',       name: 'UPS',       category: 'SHIPPING', description: 'UPS developer APIs.' },
    { key: 'bobgo',     name: 'BobGo',     category: 'SHIPPING', description: 'SA shipping aggregator.' },

    // ── CMS / CONTENT ──────────────────────────────────────────
    { key: 'wordpress',  name: 'WordPress',  category: 'CMS', description: 'Headless or full WP via REST.' },
    { key: 'contentful', name: 'Contentful', category: 'CMS', description: 'Headless content platform.' },
    { key: 'sanity',     name: 'Sanity',     category: 'CMS', description: 'Structured-content CMS.' },
    { key: 'strapi',     name: 'Strapi',     category: 'CMS', description: 'Open-source headless CMS.' },
    { key: 'directus',   name: 'Directus',   category: 'CMS', description: 'Open-source data platform.' },

    // ── SEARCH / INDEXING ──────────────────────────────────────
    { key: 'algolia',       name: 'Algolia',       category: 'SEARCH', description: 'Hosted search-as-a-service.' },
    { key: 'elasticsearch', name: 'Elasticsearch', category: 'SEARCH', description: 'Distributed search engine.' },
    { key: 'meilisearch',   name: 'Meilisearch',   category: 'SEARCH', description: 'Fast typo-tolerant search.' },

    // ── CLOUD / DEVOPS ─────────────────────────────────────────
    { key: 'cloudflare',   name: 'Cloudflare',   category: 'CLOUD', description: 'DNS, CDN, edge functions, R2.' },
    { key: 'vercel',       name: 'Vercel',       category: 'CLOUD', description: 'Frontend deployment + edge.' },
    { key: 'netlify',      name: 'Netlify',      category: 'CLOUD', description: 'Frontend deployment + functions.' },
    { key: 'digitalocean', name: 'DigitalOcean', category: 'CLOUD', description: 'Cloud VPS + App Platform.' },
    { key: 'aws',          name: 'AWS',          category: 'CLOUD', description: 'Amazon Web Services suite.' },
    { key: 'gcp',          name: 'Google Cloud', category: 'CLOUD', description: 'GCP suite of services.' },
    { key: 'azure',        name: 'Microsoft Azure', category: 'CLOUD', description: 'Azure suite of services.' },

    // ── AI MODELS ──────────────────────────────────────────────
    { key: 'openai',     name: 'OpenAI',     category: 'AI', description: 'GPT-4 and GPT-4o models.' },
    { key: 'anthropic',  name: 'Anthropic',  category: 'AI', description: 'Claude models.' },
    { key: 'google_gemini', name: 'Google Gemini', category: 'AI', description: 'Gemini Pro + multimodal.' },
    { key: 'mistral',    name: 'Mistral AI', category: 'AI', description: 'Open-weight + hosted models.' },
    { key: 'cohere',     name: 'Cohere',     category: 'AI', description: 'Command, Embed, Rerank.' },
    { key: 'perplexity', name: 'Perplexity', category: 'AI', description: 'Search + answer API.' },
    { key: 'deepseek',   name: 'DeepSeek',   category: 'AI', description: 'DeepSeek-V3 and R1.' },

    // ── VECTOR / RAG STORES ────────────────────────────────────
    { key: 'pinecone', name: 'Pinecone', category: 'VECTOR', description: 'Managed vector database.' },
    { key: 'weaviate', name: 'Weaviate', category: 'VECTOR', description: 'Open-source vector DB.' },
    { key: 'qdrant',   name: 'Qdrant',   category: 'VECTOR', description: 'Vector similarity search.' },
    { key: 'chroma',   name: 'Chroma',   category: 'VECTOR', description: 'Embedding database.' },

    // ── AI AGENT FRAMEWORKS ────────────────────────────────────
    { key: 'langchain', name: 'LangChain', category: 'AGENT', description: 'LLM application framework.' },
    { key: 'crewai',    name: 'CrewAI',    category: 'AGENT', description: 'Multi-agent orchestration.' },
    { key: 'autogen',   name: 'AutoGen',   category: 'AGENT', description: 'Microsoft multi-agent framework.' },

    // ── MEDIA / VIDEO ──────────────────────────────────────────
    { key: 'mux',        name: 'Mux',        category: 'MEDIA', description: 'Video streaming infrastructure.' },
    { key: 'cloudinary', name: 'Cloudinary', category: 'MEDIA', description: 'Image + video transformation.' },
    { key: 'vimeo',      name: 'Vimeo',      category: 'MEDIA', description: 'Video hosting + APIs.' },
    { key: 'youtube',    name: 'YouTube',    category: 'MEDIA', description: 'YouTube Data + Upload APIs.' },
    { key: 'agora',      name: 'Agora',      category: 'MEDIA', description: 'Real-time voice + video.' },

    // ── HR / RECRUITMENT ───────────────────────────────────────
    { key: 'greenhouse', name: 'Greenhouse', category: 'HR', description: 'ATS + hiring platform.' },
    { key: 'lever',      name: 'Lever',      category: 'HR', description: 'Talent acquisition suite.' },
    { key: 'bamboohr',   name: 'BambooHR',   category: 'HR', description: 'HR information system.' },
    { key: 'workable',   name: 'Workable',   category: 'HR', description: 'ATS + recruiting CRM.' },

    // ── LEGAL / COMPLIANCE ─────────────────────────────────────
    { key: 'onetrust',   name: 'OneTrust',   category: 'LEGAL', description: 'Privacy + consent management.' },
    { key: 'termly',     name: 'Termly',     category: 'LEGAL', description: 'Policy + consent generator.' },
    { key: 'cookiebot',  name: 'Cookiebot',  category: 'LEGAL', description: 'Cookie consent + GDPR.' },

    // ── MAPS / LOCATION ────────────────────────────────────────
    { key: 'google_maps',    name: 'Google Maps',    category: 'MAPS', description: 'Maps, Places, Geocoding.' },
    { key: 'mapbox',         name: 'Mapbox',         category: 'MAPS', description: 'Custom maps + nav APIs.' },
    { key: 'openstreetmap',  name: 'OpenStreetMap',  category: 'MAPS', description: 'Open mapping data.' },

    // ── COMMUNICATION (chat/meetings) ──────────────────────────
    { key: 'whatsapp',  name: 'WhatsApp',         category: 'COMMUNICATION', description: 'WhatsApp Cloud API.' },
    { key: 'zoom',      name: 'Zoom',             category: 'COMMUNICATION', description: 'Meetings + webinars.' },
    { key: 'teams',     name: 'Microsoft Teams',  category: 'COMMUNICATION', description: 'Meetings + chat.' },

    // ── PRODUCTIVITY / WORKSPACE ───────────────────────────────
    { key: 'google_workspace', name: 'Google Workspace', category: 'PRODUCTIVITY', description: 'Gmail, Drive, Calendar.' },
    { key: 'microsoft_365',    name: 'Microsoft 365',    category: 'PRODUCTIVITY', description: 'Outlook, OneDrive, Teams.' },

    // ── ACCOUNTING ─────────────────────────────────────────────
    { key: 'xero',       name: 'Xero',       category: 'ACCOUNTING', description: 'Cloud accounting.' },
    { key: 'sage',       name: 'Sage',       category: 'ACCOUNTING', description: 'Sage accounting.' },
    { key: 'quickbooks', name: 'QuickBooks', category: 'ACCOUNTING', description: 'Intuit QuickBooks.' },

    // ── AUTOMATION ─────────────────────────────────────────────
    { key: 'zapier', name: 'Zapier', category: 'AUTOMATION', description: '6000+ app automations.' },
    { key: 'make',   name: 'Make',   category: 'AUTOMATION', description: 'Visual automation.' },
    { key: 'n8n',    name: 'n8n',    category: 'AUTOMATION', description: 'Self-hosted automation.' },

    // ── CALENDAR ───────────────────────────────────────────────
    { key: 'calendly',        name: 'Calendly',        category: 'CALENDAR', description: 'Scheduling.' },
    { key: 'google_calendar', name: 'Google Calendar', category: 'CALENDAR', description: 'Calendar sync.' },
    { key: 'outlook',         name: 'Outlook',         category: 'CALENDAR', description: 'Calendar sync.' },

    // ── STORAGE / BAAS ─────────────────────────────────────────
    { key: 'firebase', name: 'Firebase', category: 'STORAGE', description: 'Realtime DB + storage.' },
    { key: 'supabase', name: 'Supabase', category: 'STORAGE', description: 'Postgres + storage + auth.' },
  ];

  for (const i of items) {
    const slug = SIMPLEICONS_SLUG[i.key];
    const iconUrl = slug === undefined
      ? `https://cdn.simpleicons.org/${i.key.replace(/_/g, '')}` // fallback: strip underscores
      : (slug === null ? null : `https://cdn.simpleicons.org/${slug}`);
    const popular = POPULAR_KEYS.has(i.key);
    const configSchema = configSchemaFor(i.key) as Prisma.InputJsonValue;

    await prisma.integrationCatalog.upsert({
      where: { key: i.key },
      update: { name: i.name, category: i.category, description: i.description, iconUrl, popular, configSchema },
      create: { key: i.key, name: i.name, category: i.category, description: i.description, iconUrl, popular, configSchema },
    });
  }
  console.log(`✓ Seeded ${items.length} integrations (${[...POPULAR_KEYS].length} popular)`);
}

async function seedAIPrompts() {
  const prompts = [
    {
      key: 'generate.site',
      name: 'Generate full site',
      kind: 'SITE' as AIGenerationKind,
      provider: 'CLAUDE_CODE_MANUAL' as AIProvider,
      model: 'manual',
      systemPrompt:
        'You are MADCreate, a principal-level SaaS web architect. ' +
        'You produce strict JSON describing modern, premium, conversion-focused websites. ' +
        'Never include markdown fences. Output must be valid JSON conforming to the provided schema.',
      userTemplate:
        'Generate a complete site JSON for the business below. ' +
        'Include navigation, pages (home/about/services/contact at minimum), and per-page sections.\n\n' +
        'Business: {{businessName}}\nIndustry: {{industry}}\nDescription: {{description}}\n' +
        'Audience: {{targetAudience}}\nStyle: {{visualStyle}}\nGoals: {{goals}}',
      temperature: 0.6,
    },
    {
      key: 'generate.page',
      name: 'Generate single page',
      kind: 'PAGE' as AIGenerationKind,
      provider: 'CLAUDE_CODE_MANUAL' as AIProvider,
      model: 'manual',
      systemPrompt:
        'You output one valid JSON page schema with sections, props, and copy. No markdown.',
      userTemplate:
        'Generate the "{{pageType}}" page for {{businessName}}. ' +
        'Visual style: {{visualStyle}}. Tone: {{tone}}. Goal: {{pageGoal}}.',
      temperature: 0.7,
    },
    {
      key: 'generate.section.hero',
      name: 'Hero section',
      kind: 'SECTION' as AIGenerationKind,
      provider: 'CLAUDE_CODE_MANUAL' as AIProvider,
      model: 'manual',
      systemPrompt: 'Output JSON for a hero section: { heading, subheading, primaryCta, secondaryCta, eyebrow }.',
      userTemplate: 'Business: {{businessName}}. Audience: {{audience}}. Promise: {{promise}}.',
      temperature: 0.8,
    },
    {
      key: 'generate.palette',
      name: 'Color palette',
      kind: 'PALETTE' as AIGenerationKind,
      provider: 'CLAUDE_CODE_MANUAL' as AIProvider,
      model: 'manual',
      systemPrompt:
        'Output JSON: { primary, secondary, accent, background, surface, foreground, muted } as hex strings. ' +
        'Palette must be aesthetically modern and WCAG-AA friendly.',
      userTemplate: 'Brand: {{brand}}. Mood: {{mood}}. Industry: {{industry}}.',
      temperature: 0.4,
    },
    {
      key: 'generate.typography',
      name: 'Typography pairing',
      kind: 'TYPOGRAPHY' as AIGenerationKind,
      provider: 'CLAUDE_CODE_MANUAL' as AIProvider,
      model: 'manual',
      systemPrompt:
        'Output JSON: { headingFamily, bodyFamily, headingWeights:[400,600,800], bodyWeights:[400,500] }. ' +
        'Use only Google Fonts families.',
      userTemplate: 'Style: {{style}}. Industry: {{industry}}.',
      temperature: 0.3,
    },
    {
      key: 'generate.copy',
      name: 'Improve copy',
      kind: 'COPY' as AIGenerationKind,
      provider: 'CLAUDE_CODE_MANUAL' as AIProvider,
      model: 'manual',
      systemPrompt: 'Rewrite the input copy to be sharper, more conversion-focused, and on-brand. Return only the rewritten copy.',
      userTemplate: 'Brand voice: {{voice}}\nOriginal: {{copy}}',
      temperature: 0.7,
    },
    {
      key: 'generate.seo',
      name: 'SEO metadata',
      kind: 'SEO' as AIGenerationKind,
      provider: 'CLAUDE_CODE_MANUAL' as AIProvider,
      model: 'manual',
      systemPrompt: 'Output JSON: { metaTitle (<=60 chars), metaDescription (<=155 chars), keywords:string[], ogTitle, ogDescription }.',
      userTemplate: 'Page: {{pageTitle}}. Content summary: {{summary}}.',
      temperature: 0.4,
    },
  ];

  for (const p of prompts) {
    await prisma.aIPrompt.upsert({
      where: { key: p.key },
      update: {
        name: p.name,
        kind: p.kind,
        provider: p.provider,
        model: p.model,
        systemPrompt: p.systemPrompt,
        userTemplate: p.userTemplate,
        temperature: p.temperature,
        isActive: true,
      },
      create: p,
    });
  }
  console.log(`✓ Seeded ${prompts.length} AI prompts`);
}

async function seedSuperAdmin() {
  const email = 'admin@madcreate.local';
  const user = await prisma.user.upsert({
    where: { email },
    update: { isSuperAdmin: true },
    create: {
      email,
      passwordHash: await hashPassword('ChangeMeNow!23'),
      firstName: 'MAD',
      lastName: 'Admin',
      isSuperAdmin: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✓ Super admin: ${user.email} (password: ChangeMeNow!23 — change immediately)`);
  return user;
}

async function seedDemoWorkspace(ownerId: string) {
  const plan = await prisma.plan.findUnique({ where: { code: 'growth' } });
  const ws = await prisma.workspace.upsert({
    where: { slug: 'mad-products' },
    update: {},
    create: {
      slug: 'mad-products',
      name: 'MAD Prospects',
      ownerUserId: ownerId,
      planId: plan?.id,
      description: 'The MADCreate demo workspace.',
    },
  });
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: ws.id, userId: ownerId } },
    update: { role: Role.WORKSPACE_OWNER },
    create: { workspaceId: ws.id, userId: ownerId, role: Role.WORKSPACE_OWNER, joinedAt: new Date() },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      workspaceId: ws.id,
      slug: 'demo',
      name: 'Demo Site',
      industry: 'SaaS',
      description: 'A demo tenant generated by the MADCreate seed.',
      branding: {
        primary: '#7C5CFF',
        secondary: '#0EA5E9',
        accent: '#F472B6',
        voice: 'Confident, futuristic, premium.',
      },
    },
  });

  // Default theme
  const theme = await prisma.theme.create({
    data: {
      tenantId: tenant.id,
      name: 'Default Dark',
      isActive: true,
      tokens: {
        colors: {
          primary: '#7C5CFF',
          secondary: '#0EA5E9',
          accent: '#F472B6',
          background: '#0B0B12',
          surface: '#13131C',
          foreground: '#FAFAFA',
          muted: '#9CA3AF',
        },
        typography: {
          headingFamily: 'Inter',
          bodyFamily: 'Inter',
          headingWeights: [600, 800],
          bodyWeights: [400, 500],
        },
        spacing: { unit: 4 },
        radius: { sm: 6, md: 12, lg: 20, xl: 28 },
        shadow: { card: '0 10px 40px rgba(0,0,0,0.35)' },
        motion: { duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      },
    },
  });

  const site = await prisma.site.create({
    data: {
      tenantId: tenant.id,
      name: 'Demo Site',
      themeId: theme.id,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      navigation: {
        items: [
          { label: 'Home', href: '/' },
          { label: 'Features', href: '/#features' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'Contact', href: '/contact' },
        ],
      },
      settings: { faviconUrl: null },
    },
  });

  await prisma.page.create({
    data: {
      tenantId: tenant.id,
      siteId: site.id,
      slug: 'home',
      title: 'Demo Site — Home',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      schema: {
        sections: [
          {
            kind: 'hero',
            props: {
              eyebrow: 'Built with MADCreate',
              heading: 'Ship a premium site in minutes.',
              subheading: 'AI-native generation. Visual editing. Custom domains. Dynamic hosting.',
              primaryCta: { label: 'Start free', href: '/register' },
              secondaryCta: { label: 'See demo', href: '/demo' },
            },
          },
          {
            kind: 'features',
            props: {
              heading: 'Built like a product company would build it.',
              items: [
                { title: 'AI generation', body: 'Generate sites, pages, sections, copy, palettes and SEO.' },
                { title: 'Visual editor', body: 'Drag, edit and regenerate sections live.' },
                { title: 'Custom domains', body: 'Map any domain. SSL handled.' },
                { title: 'Multi-tenant', body: 'Run hundreds of tenants from one platform.' },
              ],
            },
          },
          { kind: 'cta', props: { heading: 'Build the future.', cta: { label: 'Get started', href: '/register' } } },
        ],
      },
    },
  });

  await prisma.domain.upsert({
    where: { hostname: 'demo.madcreate.madleads.ai' },
    update: {},
    create: {
      tenantId: tenant.id,
      hostname: 'demo.madcreate.madleads.ai',
      type: 'SUBDOMAIN',
      status: 'ACTIVE',
      isPrimary: true,
      sslStatus: 'active',
    },
  });

  console.log(`✓ Demo workspace + tenant ('${tenant.slug}') + site + page seeded`);
}

async function main() {
  console.log('Seeding MADCreate database…');
  await seedPlans();
  await seedIntegrationCatalog();
  await seedAIPrompts();
  const admin = await seedSuperAdmin();
  await seedDemoWorkspace(admin.id);
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
