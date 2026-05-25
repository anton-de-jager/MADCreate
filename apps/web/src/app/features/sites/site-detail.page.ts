import { Component, ChangeDetectionStrategy, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

interface Page { id: string; slug: string; title: string; status: string; order: number; }
interface Site { id: string; name: string; status: string; tenantId: string; pages: Page[]; theme?: { name: string } | null }

@Component({
  selector: 'mc-site-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (site(); as s) {
    <div class="flex items-start justify-between mb-8">
      <div>
        <a routerLink="/app/sites" class="text-sm text-fg-muted hover:text-fg">← Sites</a>
        <h1 class="mc-heading text-3xl font-bold mt-1">{{ s.name }}</h1>
        <p class="text-fg-muted mt-1">{{ s.status }} · {{ s.pages.length }} pages</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="mc-btn-secondary" (click)="publish()" [disabled]="publishing()">
          @if (publishing()) { Publishing… } @else { <i class="fa-solid fa-check"></i> Publish }
        </button>
        <button class="mc-btn-secondary text-red-400 hover:text-red-300" (click)="deleteSite()">Delete Site</button>
      </div>
    </div>

    <div class="mc-card overflow-hidden">
      <div class="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <h2 class="mc-heading text-lg font-semibold">Pages</h2>
        <button class="mc-btn-secondary text-sm" (click)="showAddPage.set(!showAddPage())">
          {{ showAddPage() ? 'Cancel' : '+ Add Page' }}
        </button>
      </div>
      @if (showAddPage()) {
        <div class="px-5 py-4 border-b border-white/5 flex items-end gap-3">
          <label class="flex flex-col gap-1 flex-1">
            <span class="text-xs text-fg-muted">Title</span>
            <input class="mc-input" [(ngModel)]="newPageTitle" placeholder="Page title" />
          </label>
          <label class="flex flex-col gap-1 flex-1">
            <span class="text-xs text-fg-muted">Slug</span>
            <input class="mc-input" [(ngModel)]="newPageSlug" placeholder="page-slug" />
          </label>
          <button class="mc-btn-primary" (click)="addPage()" [disabled]="addingPage() || !newPageTitle || !newPageSlug">
            {{ addingPage() ? 'Adding…' : 'Add' }}
          </button>
        </div>
      }
      <ul class="divide-y divide-white/5">
        @for (p of s.pages; track p.id) {
          <li class="px-5 py-4 flex items-center justify-between">
            <div>
              <a [routerLink]="['/app/builder', p.id]" class="font-medium hover:text-brand">{{ p.title }}</a>
              <div class="text-xs text-fg-subtle mt-0.5 font-mono">/{{ p.slug }}</div>
            </div>
            <div class="flex items-center gap-3">
              <span class="mc-chip">{{ p.status }}</span>
              <a [routerLink]="['/app/builder', p.id]" class="mc-btn-ghost text-xs">Edit →</a>
              <button class="mc-btn-ghost text-xs text-red-400 hover:text-red-300" (click)="deletePage(p)">Delete</button>
            </div>
          </li>
        }
      </ul>
    </div>
  }
  `,
})
export class SiteDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  @Input() id!: string;

  protected readonly site = signal<Site | null>(null);
  protected readonly publishing = signal(false);
  protected readonly showAddPage = signal(false);
  protected readonly addingPage = signal(false);
  protected newPageTitle = '';
  protected newPageSlug = '';

  ngOnInit() {
    this.api.get<Site>(`/sites/${this.id}`).subscribe({
      next: (s) => this.site.set(s),
      error: (e: Error) => this.notify.error(e.message ?? 'Failed to load site'),
    });
  }

  async publish() {
    this.publishing.set(true);
    this.api.post(`/sites/${this.id}/publish`).subscribe({
      next: () => { this.ngOnInit(); this.notify.success('Site published.'); },
      complete: () => this.publishing.set(false),
      error: (e: Error) => {
        this.publishing.set(false);
        this.notify.error(e.message ?? 'Something went wrong');
      },
    });
  }

  deleteSite() {
    const s = this.site();
    if (!s) return;
    this.notify.confirm(
      `Delete site "${s.name}"?`,
      'This will permanently remove the site and all its pages. This cannot be undone.',
      { confirmLabel: 'Delete', danger: true },
    ).subscribe((ok) => {
      if (!ok) return;
      this.api.delete(`/sites/${this.id}`).subscribe({
        next: () => {
          this.notify.success('Site deleted.');
          this.router.navigate(['/app/sites']);
        },
        error: (e: Error) => this.notify.error(e.message ?? 'Delete failed'),
      });
    });
  }

  deletePage(p: Page) {
    this.notify.confirm(
      `Delete page "${p.title}"?`,
      'This page will be permanently removed. This cannot be undone.',
      { confirmLabel: 'Delete', danger: true },
    ).subscribe((ok) => {
      if (!ok) return;
      this.api.delete(`/pages/${p.id}`).subscribe({
        next: () => {
          this.notify.success('Page deleted.');
          this.ngOnInit();
        },
        error: (e: Error) => this.notify.error(e.message ?? 'Delete failed'),
      });
    });
  }

  addPage() {
    const title = this.newPageTitle.trim();
    const slug = this.newPageSlug.trim();
    if (!title || !slug) return;
    this.addingPage.set(true);
    this.api.post('/pages', { title, slug }, { siteId: this.id }).subscribe({
      next: () => {
        this.notify.success('Page created.');
        this.newPageTitle = '';
        this.newPageSlug = '';
        this.showAddPage.set(false);
        this.addingPage.set(false);
        this.ngOnInit();
      },
      error: (e: Error) => {
        this.addingPage.set(false);
        this.notify.error(e.message ?? 'Failed to create page');
      },
    });
  }
}
