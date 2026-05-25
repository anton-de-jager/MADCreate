import { Component, ChangeDetectionStrategy, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '@env/environment';

export interface NewsletterSectionCtaProps {
  label?: string;
}

export interface NewsletterSectionProps {
  heading?: string;
  body?: string;
  cta?: NewsletterSectionCtaProps;
  formKey?: string;
}

@Component({
  selector: 'mc-newsletter-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-20">
    <div class="max-w-2xl mx-auto text-center">
      @if (props?.heading) {
        <h2 class="mc-heading text-3xl font-bold mb-3">{{ props.heading }}</h2>
      }
      @if (props?.body) {
        <p class="text-fg-muted mb-6">{{ props.body }}</p>
      }
      @if (state() === 'done') {
        <p class="text-sm text-green-400"><i class="fa-solid fa-check"></i> Thanks for subscribing!</p>
      } @else {
        <form class="flex gap-3 max-w-md mx-auto" (ngSubmit)="submit($event)">
          <input type="email" placeholder="your@email.com" class="mc-input flex-1"
                 [(ngModel)]="email" name="email" required />
          <input class="absolute opacity-0 pointer-events-none h-0 w-0 -z-10"
                 type="text" tabindex="-1" autocomplete="off"
                 name="website" [(ngModel)]="honeypot" aria-hidden="true" />
          <button type="submit" class="mc-btn-primary !px-6 whitespace-nowrap" [disabled]="state() === 'sending'">
            {{ state() === 'sending' ? 'Subscribing…' : (props?.cta?.label || 'Subscribe') }}
          </button>
        </form>
        @if (error()) { <p class="text-xs text-danger mt-2">{{ error() }}</p> }
      }
    </div>
  </section>
  `,
})
export class NewsletterSection {
  @Input() props: NewsletterSectionProps = {};
  @Input() tenantId?: string;
  @Input() pageSlug?: string;

  protected email = '';
  protected honeypot = '';
  protected readonly state = signal<'idle' | 'sending' | 'done'>('idle');
  protected readonly error = signal<string | null>(null);

  protected async submit(ev: Event) {
    ev.preventDefault();
    if (this.honeypot) { this.state.set('done'); return; }
    if (!this.tenantId) { this.error.set('Form not configured (missing tenantId).'); return; }
    if (!this.email.trim()) { this.error.set('Please enter an email.'); return; }
    this.state.set('sending'); this.error.set(null);

    try {
      const r = await fetch(`${environment.apiBaseUrl}/forms?tenantId=${encodeURIComponent(this.tenantId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formKey: this.props?.formKey ?? 'newsletter',
          pageSlug: this.pageSlug ?? null,
          email: this.email.trim(),
          data: { email: this.email.trim() },
        }),
      });
      if (!r.ok) {
        const body = await r.text();
        throw new Error(`Subscribe failed (HTTP ${r.status}). ${body.slice(0, 200)}`);
      }
      this.state.set('done');
    } catch (e) {
      this.error.set((e as Error).message);
      this.state.set('idle');
    }
  }
}
