import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CFRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
}

/**
 * Thin wrapper over the Cloudflare v4 API.
 * All methods become no-ops (return null) when CLOUDFLARE_API_TOKEN / ZONE_ID
 * aren't configured, so the platform still works without Cloudflare.
 */
@Injectable()
export class CloudflareService {
  private readonly logger = new Logger(CloudflareService.name);
  private readonly base = 'https://api.cloudflare.com/client/v4';

  constructor(private readonly config: ConfigService) {}

  private creds(): { token: string; zoneId: string } | null {
    const token = this.config.get<string>('cloudflare.apiToken');
    const zoneId = this.config.get<string>('cloudflare.zoneId');
    if (!token || !zoneId) return null;
    return { token, zoneId };
  }

  isConfigured(): boolean {
    return this.creds() !== null;
  }

  /** Create or update a single DNS record. Returns the resulting record id or null when CF unconfigured. */
  async upsertRecord(input: { type: 'A' | 'AAAA' | 'CNAME' | 'TXT'; name: string; content: string; ttl?: number; proxied?: boolean }): Promise<string | null> {
    const c = this.creds();
    if (!c) return null;

    // Look up existing record by name+type
    const list = await this.api<{ result: CFRecord[] }>('GET', `/zones/${c.zoneId}/dns_records?type=${input.type}&name=${encodeURIComponent(input.name)}`, c.token);
    const existing = list?.result?.[0];

    const body = {
      type: input.type,
      name: input.name,
      content: input.content,
      ttl: input.ttl ?? 300,
      proxied: input.proxied ?? (input.type === 'CNAME' || input.type === 'A'),
    };

    if (existing) {
      const r = await this.api<{ result: CFRecord }>('PUT', `/zones/${c.zoneId}/dns_records/${existing.id}`, c.token, body);
      return r?.result?.id ?? null;
    }
    const r = await this.api<{ result: CFRecord }>('POST', `/zones/${c.zoneId}/dns_records`, c.token, body);
    return r?.result?.id ?? null;
  }

  async deleteRecord(recordId: string): Promise<boolean> {
    const c = this.creds();
    if (!c) return false;
    const r = await this.api<{ success: boolean }>('DELETE', `/zones/${c.zoneId}/dns_records/${recordId}`, c.token);
    return !!r?.success;
  }

  /**
   * For a custom tenant hostname: create the CNAME → platform host + TXT verify record.
   * Returns the CF record id of the CNAME (so we can store it on the Domain row).
   */
  async wireCustomDomain(hostname: string, platformHost: string, verifyToken: string): Promise<{ cnameId: string | null; txtId: string | null }> {
    if (!this.isConfigured()) return { cnameId: null, txtId: null };
    const [cnameId, txtId] = await Promise.all([
      this.upsertRecord({ type: 'CNAME', name: hostname, content: platformHost, proxied: true }),
      this.upsertRecord({ type: 'TXT', name: `_madcreate.${hostname}`, content: verifyToken, ttl: 120 }),
    ]);
    return { cnameId, txtId };
  }

  /** Issue an Origin Certificate or trigger Universal SSL for the zone. Best-effort. */
  async ensureUniversalSsl(): Promise<boolean> {
    const c = this.creds();
    if (!c) return false;
    const r = await this.api<{ success: boolean }>('PATCH', `/zones/${c.zoneId}/ssl/universal/settings`, c.token, { enabled: true });
    return !!r?.success;
  }

  private async api<T>(method: string, path: string, token: string, body?: unknown): Promise<T | null> {
    try {
      const res = await fetch(`${this.base}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as { success: boolean; errors?: Array<{ message: string }>; result?: unknown };
      if (!res.ok || json.success === false) {
        this.logger.warn(`CF API ${method} ${path} failed: ${json.errors?.map((e) => e.message).join('; ') ?? res.status}`);
        return null;
      }
      return json as unknown as T;
    } catch (err) {
      this.logger.error(`CF API ${method} ${path} error: ${(err as Error).message}`);
      return null;
    }
  }
}
