import { Component, ChangeDetectionStrategy, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '@env/environment';

export interface ContactSectionProps {
  heading?: string;
  email?: string;
  phone?: string;
  address?: string;
  formKey?: string;
}

@Component({
  selector: 'mc-contact-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-20">
    <div class="max-w-3xl mx-auto">
      <h2 class="mc-heading text-3xl md:text-4xl font-bold text-center mb-10">{{ props?.heading || 'Get in touch' }}</h2>
      <div class="mc-card p-6 grid md:grid-cols-2 gap-6">
        <div class="space-y-3 text-sm text-fg-muted">
          @if (props?.email)   { <div><i class="fa-solid fa-envelope"></i> {{ props.email }}</div> }
          @if (props?.phone)   { <div><i class="fa-solid fa-phone"></i> {{ props.phone }}</div> }
          @if (props?.address) { <div><i class="fa-solid fa-location-dot"></i> {{ props.address }}</div> }
        </div>
        @if (state() === 'done') {
          <div class="text-sm">
            <div class="text-2xl text-green-400 mb-1"><i class="fa-solid fa-check"></i></div>
            <p class="text-fg">Thanks — we'll be in touch.</p>
          </div>
        } @else {
          <form class="space-y-3" (ngSubmit)="submit($event)">
            <input class="mc-input" placeholder="Your name" [(ngModel)]="name" name="name" />
            <input class="mc-input" type="email" placeholder="Your email" [(ngModel)]="email" name="email" required />
            <textarea class="mc-input min-h-24" placeholder="Your message" [(ngModel)]="message" name="message"></textarea>
            <!-- Honeypot: real users never fill this. Bots filling every input
                 will land it server-side; we silently drop these submissions
                 (no error message — defeats detection probes). The label is
                 visually hidden but readable to scrapers. -->
            <input class="absolute opacity-0 pointer-events-none h-0 w-0 -z-10"
                   type="text" tabindex="-1" autocomplete="off"
                   name="website" [(ngModel)]="honeypot"
                   aria-hidden="true" />
            @if (error()) { <div class="text-xs text-danger">{{ error() }}</div> }
            <button type="submit" class="mc-btn-primary w-full" [disabled]="state() === 'sending'">
              {{ state() === 'sending' ? 'Sending…' : 'Send' }}
            </button>
          </form>
        }
      </div>
    </div>
  </section>
  `,
})
export class ContactSection {
  @Input() props: ContactSectionProps = {};
  /** Tenant ID of the rendered site — passed down from tenant-render.page. */
  @Input() tenantId?: string;
  /** Slug of the page this section sits on, for analytics + lead attribution. */
  @Input() pageSlug?: string;

  protected name = '';
  protected email = '';
  protected message = '';
  /** Honeypot: real users leave this empty. Bot submissions silently succeed
   *  client-side (no rejection signal) but never reach the API. */
  protected honeypot = '';
  protected readonly state = signal<'idle' | 'sending' | 'done'>('idle');
  protected readonly error = signal<string | null>(null);

  // Native fetch + environment.apiBaseUrl so this section stays standalone
  // and doesn't need ApiService (which lives in the dashboard core).
  protected async submit(ev: Event) {
    ev.preventDefault();
    if (this.honeypot) {
      // Silent drop — pretend it worked so the bot doesn't iterate.
      this.state.set('done');
      return;
    }
    if (!this.tenantId) { this.error.set('Form not configured (missing tenantId).'); return; }
    if (!this.email.trim()) { this.error.set('Please enter an email.'); return; }
    this.state.set('sending'); this.error.set(null);

    try {
      const r = await fetch(`${environment.apiBaseUrl}/forms?tenantId=${encodeURIComponent(this.tenantId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formKey: this.props?.formKey ?? 'contact',
          pageSlug: this.pageSlug ?? null,
          email: this.email.trim(),
          name: this.name.trim() || undefined,
          data: {
            name: this.name.trim(),
            email: this.email.trim(),
            message: this.message.trim(),
          },
        }),
      });
      if (!r.ok) {
        const body = await r.text();
        throw new Error(`Submit failed (HTTP ${r.status}). ${body.slice(0, 200)}`);
      }
      this.state.set('done');
    } catch (e) {
      this.error.set((e as Error).message);
      this.state.set('idle');
    }
  }
}
