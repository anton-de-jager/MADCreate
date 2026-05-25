import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { TenantContextService } from '../../core/services/tenant-context.service';
import { NotificationService } from '../../core/services/notification.service';

interface Media { id: string; filename: string; kind: string; url: string; contentType: string; sizeBytes: number; }

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/ogg',
  'application/pdf',
]);

@Component({
  selector: 'mc-media',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="mb-8 flex items-center justify-between">
    <div>
      <h1 class="mc-heading text-3xl font-bold">Media</h1>
      <p class="text-fg-muted mt-1">Tenant-scoped uploads.</p>
    </div>
    <label class="mc-btn-primary cursor-pointer">
      + Upload
      <input type="file" class="hidden" multiple (change)="onFile($event)" />
    </label>
  </div>

  @if (uploadProgress() !== null) {
    <div class="mb-4 mc-card p-3">
      <div class="flex items-center gap-3">
        <span class="text-xs text-fg-muted">Uploading…</span>
        <div class="flex-1 h-2 rounded bg-surface-subtle overflow-hidden">
          <div class="h-full bg-accent rounded transition-all duration-200"
               [style.width.%]="uploadProgress()"></div>
        </div>
        <span class="text-xs font-mono text-fg-subtle">{{ uploadProgress() }}%</span>
      </div>
    </div>
  }

  @if (!tenant()) {
    <div class="mc-card p-8 text-center text-fg-muted">Pick a tenant first.</div>
  } @else if (loading()) {
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      @for (_ of [1,2,3,4,5,6,7,8,9,10,11,12]; track _) {
        <div class="mc-card p-3">
          <div class="aspect-square rounded bg-white/10 animate-pulse"></div>
          <div class="mt-2 h-3 w-24 rounded bg-white/10 animate-pulse"></div>
          <div class="mt-1 h-2 w-12 rounded bg-white/10 animate-pulse"></div>
        </div>
      }
    </div>
  } @else {
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3"
         (dragover)="onDragOver($event)"
         (dragleave)="dragging.set(false)"
         (drop)="onDrop($event)"
         (paste)="onPaste($event)"
         [class.ring-2]="dragging()"
         [class.ring-accent]="dragging()"
         [class.ring-dashed]="dragging()"
         tabindex="0">
      @for (m of items(); track m.id) {
        <div class="mc-card-hover p-3 group relative">
          @if (m.kind === 'IMAGE') {
            <div class="aspect-square rounded bg-surface-subtle overflow-hidden">
              <img [src]="m.url" [alt]="m.filename" class="w-full h-full object-cover" />
            </div>
          } @else {
            <div class="aspect-square rounded bg-surface-subtle grid place-items-center text-fg-subtle">
              {{ m.kind }}
            </div>
          }
          <div class="mt-2 text-xs truncate">{{ m.filename }}</div>
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-fg-subtle">{{ (m.sizeBytes / 1024) | number:'1.0-1' }} KB</span>
            <button class="text-[10px] text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    (click)="deleteMedia(m)">Delete</button>
          </div>
        </div>
      }
      @if (items().length === 0) {
        <div class="mc-card p-8 text-center col-span-full text-fg-muted">
          Nothing uploaded yet. Drag &amp; drop files here or click Upload.
        </div>
      }
    </div>
  }
  `,
})
export class MediaPage implements OnInit {
  private readonly api = inject(ApiService);

  private readonly tenantCtx = inject(TenantContextService);
  private readonly notify = inject(NotificationService);
  protected readonly tenant = this.tenantCtx.current;
  protected readonly items = signal<Media[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploadProgress = signal<number | null>(null);
  protected readonly dragging = signal(false);

  ngOnInit() { this.refresh(); }

  refresh() {
    const t = this.tenant(); if (!t) { this.loading.set(false); return; }
    this.api.get<Media[]>('/media', { tenantId: t.id }).subscribe({
      next: (m) => { this.items.set(m); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    this.uploadFiles(Array.from(files));
    input.value = '';
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragging.set(true);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging.set(false);
    const files = e.dataTransfer?.files;
    if (files?.length) this.uploadFiles(Array.from(files));
  }

  onPaste(e: ClipboardEvent) {
    const files = e.clipboardData?.files;
    if (files?.length) this.uploadFiles(Array.from(files));
  }

  deleteMedia(m: Media) {
    const t = this.tenant(); if (!t) return;
    this.notify.confirm(
      `Delete "${m.filename}"?`,
      `This file will be permanently removed. This cannot be undone.`,
      { confirmLabel: 'Delete', danger: true },
    ).subscribe((ok) => {
      if (!ok) return;
      this.api.delete(`/media/${m.id}`, { tenantId: t.id }).subscribe({
        next: () => {
          this.items.update(list => list.filter(x => x.id !== m.id));
          this.notify.success(`Deleted ${m.filename}.`);
        },
        error: (e: Error) => this.notify.error(e.message ?? 'Delete failed'),
      });
    });
  }

  private uploadFiles(files: File[]) {
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        this.notify.error(`${file.name} exceeds 10 MB limit.`);
        continue;
      }
      if (!ALLOWED_TYPES.has(file.type)) {
        this.notify.error(`${file.name}: unsupported file type (${file.type || 'unknown'}).`);
        continue;
      }
      this.uploadSingle(file);
    }
  }

  private uploadSingle(file: File) {
    const t = this.tenant(); if (!t) return;
    const fd = new FormData();
    fd.append('file', file);
    this.uploadProgress.set(0);
    this.api.postWithProgress('/media/upload', fd, { tenantId: t.id }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round((event.loaded / event.total) * 100));
        } else if (event.type === HttpEventType.Response) {
          this.uploadProgress.set(null);
          this.notify.success(`Uploaded ${file.name}.`);
          this.refresh();
        }
      },
      error: (e: Error) => {
        this.uploadProgress.set(null);
        this.notify.error(e.message ?? `Upload of ${file.name} failed.`);
      },
    });
  }
}
