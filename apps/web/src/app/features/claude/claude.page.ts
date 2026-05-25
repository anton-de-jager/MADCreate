import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

export type ClaudeTaskStatus =
  | 'PENDING' | 'IN_PROGRESS' | 'TO_BE_DEPLOYED' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'DEFERRED';
export type ClaudeTaskPriority = 1 | 2 | 3 | 4;
export interface ClaudeTaskAttachment {
  filename: string; originalName: string; mimeType: string; size: number; url: string;
}
export interface ClaudeTask {
  id: number;
  title: string;
  description?: string | null;
  notes?: string | null;
  status: ClaudeTaskStatus;
  priority: ClaudeTaskPriority;
  attachments?: ClaudeTaskAttachment[] | null;
  createdAt: string;
  updatedAt: string;
}
export interface ClaudePromptTemplate {
  id: number;
  name: string;
  description?: string | null;
  content: string;
}

const STATUS_OPTIONS: Array<{ value: ClaudeTaskStatus; label: string }> = [
  { value: 'PENDING',        label: 'Pending' },
  { value: 'IN_PROGRESS',    label: 'In progress' },
  { value: 'TO_BE_DEPLOYED', label: 'To be deployed' },
  { value: 'COMPLETED',      label: 'Completed' },
  { value: 'CANCELLED',      label: 'Cancelled' },
  { value: 'FAILED',         label: 'Failed' },
  { value: 'DEFERRED',       label: 'Deferred' },
];

const PRIORITY_OPTIONS: Array<{ value: ClaudeTaskPriority; label: string }> = [
  { value: 1, label: '1 - Critical' },
  { value: 2, label: '2 - High' },
  { value: 3, label: '3 - Normal' },
  { value: 4, label: '4 - Low' },
];

@Component({
  selector: 'mc-claude',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-start justify-between mb-6">
      <div>
        <span class="mc-eyebrow">Operations</span>
        <h1 class="mc-heading text-3xl font-bold mt-1 flex items-center gap-2">
          <i class="fa-solid fa-gear text-brand"></i> Claude Tasks
        </h1>
        <p class="text-fg-muted mt-1 text-sm">Track tasks the Claude Code worker is queued for, working on, and has completed.</p>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="mc-btn-secondary !px-3 !py-2" (click)="openTemplates()" title="Prompt templates"><i class="fa-solid fa-file-lines"></i></button>
        <button type="button" class="mc-btn-primary !px-3 !py-2" (click)="openNewTask()" title="New task"><i class="fa-solid fa-plus"></i></button>
        <button type="button" class="mc-btn-ghost !px-3 !py-2" (click)="loadTasks()" title="Refresh"><i class="fa-solid fa-arrows-rotate"></i></button>
      </div>
    </div>

    <!-- Worker toggles -->
    <div class="flex flex-wrap items-center gap-4 mb-6 p-3 mc-card">
      <span class="text-xs text-fg-muted font-semibold uppercase tracking-wider">Worker controls</span>
      <label class="flex items-center gap-2 cursor-pointer select-none" title="Enable/disable the Claude Code worker from picking up tasks">
        <div class="relative">
          <input type="checkbox" class="sr-only peer" [checked]="settingsWorkerActive()" (change)="toggleSetting('workerActive', $any($event.target).checked)" />
          <div class="w-9 h-5 rounded-full bg-white/10 peer-checked:bg-green-500/60 transition-colors"></div>
          <div class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></div>
        </div>
        <span class="text-sm" [class.text-green-400]="settingsWorkerActive()" [class.text-fg-muted]="!settingsWorkerActive()">Active</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer select-none" title="Enable/disable the scanner that looks for outstanding issues">
        <div class="relative">
          <input type="checkbox" class="sr-only peer" [checked]="settingsScannerActive()" (change)="toggleSetting('scannerActive', $any($event.target).checked)" />
          <div class="w-9 h-5 rounded-full bg-white/10 peer-checked:bg-green-500/60 transition-colors"></div>
          <div class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></div>
        </div>
        <span class="text-sm" [class.text-green-400]="settingsScannerActive()" [class.text-fg-muted]="!settingsScannerActive()">Scanner</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer select-none" title="Deploy after the next completed task before continuing">
        <div class="relative">
          <input type="checkbox" class="sr-only peer" [checked]="settingsDeployNext()" (change)="toggleSetting('deployNext', $any($event.target).checked)" />
          <div class="w-9 h-5 rounded-full bg-white/10 peer-checked:bg-amber-500/60 transition-colors"></div>
          <div class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></div>
        </div>
        <span class="text-sm" [class.text-amber-400]="settingsDeployNext()" [class.text-fg-muted]="!settingsDeployNext()">Deploy Next</span>
      </label>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
      <div class="mc-card p-4">
        <div class="text-xs text-fg-muted">Total</div>
        <div class="mc-heading text-2xl font-bold">{{ allTasks().length }}</div>
      </div>
      <div class="mc-card p-4">
        <div class="text-xs text-blue-400">In progress</div>
        <div class="mc-heading text-2xl font-bold">{{ countOf('IN_PROGRESS') }}</div>
      </div>
      <div class="mc-card p-4">
        <div class="text-xs text-yellow-500">Pending</div>
        <div class="mc-heading text-2xl font-bold">{{ countOf('PENDING') }}</div>
      </div>
      <div class="mc-card p-4">
        <div class="text-xs text-purple-400">To deploy</div>
        <div class="mc-heading text-2xl font-bold">{{ countOf('TO_BE_DEPLOYED') }}</div>
      </div>
      <div class="mc-card p-4">
        <div class="text-xs text-green-500">Completed</div>
        <div class="mc-heading text-2xl font-bold">{{ countOf('COMPLETED') }}</div>
      </div>
      <div class="mc-card p-4">
        <div class="text-xs text-red-500">Failed</div>
        <div class="mc-heading text-2xl font-bold">{{ countOf('FAILED') }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-4 text-sm">
      <label class="text-fg-muted">Status</label>
      <select class="mc-input !py-1.5 !w-auto" [value]="statusFilter()" (change)="statusFilter.set($any($event.target).value)">
        <option value="">All statuses</option>
        <option value="not_completed">Not completed</option>
        @for (s of statuses; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
      </select>
      <label class="text-fg-muted ml-4">Order by</label>
      <select class="mc-input !py-1.5 !w-auto" [value]="orderBy()" (change)="orderBy.set($any($event.target).value)">
        <option value="priority">Priority</option>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="updated">Recently updated</option>
      </select>
      <label class="text-fg-muted ml-4">Show last completed</label>
      <select class="mc-input !py-1.5 !w-auto" [value]="lastCompleted()" (change)="lastCompleted.set(+$any($event.target).value)">
        <option [value]="5">5</option>
        <option [value]="10">10</option>
        <option [value]="25">25</option>
        <option [value]="50">50</option>
        <option [value]="9999">All</option>
      </select>
      <div class="ml-auto text-xs text-fg-subtle">Worker polls <code>/v1/claude-tasks/next</code></div>
    </div>

    <!-- Task list -->
    @if (loading()) {
      <div class="mc-card p-12 text-center text-sm text-fg-muted">Loading…</div>
    } @else if (filteredTasks().length === 0) {
      <div class="mc-card p-12 text-center">
        <div class="text-fg-muted text-sm mb-3">No tasks yet.</div>
        <button type="button" class="mc-btn-primary !px-4 !py-2" (click)="openNewTask()" title="Add your first task"><i class="fa-solid fa-plus"></i></button>
      </div>
    } @else {
      <div class="space-y-2">
        @for (t of filteredTasks(); track t.id) {
          <div class="mc-card-hover p-4 cursor-pointer group" (click)="openEdit(t)">
            <div class="flex items-start gap-3">
              <i [class]="statusIcon(t.status)" [title]="t.status"></i>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="font-mono text-xs text-fg-subtle">#{{ t.id }}</span>
                  <span class="font-semibold truncate">{{ t.title }}</span>
                </div>
                @if (t.description) {
                  <p class="text-sm text-fg-muted line-clamp-2">{{ t.description }}</p>
                }
                @if (t.notes) {
                  <p class="text-xs text-fg-subtle italic line-clamp-1 mt-0.5">{{ t.notes }}</p>
                }
                <div class="flex items-center gap-2 mt-2 text-xs">
                  <span class="mc-chip !text-[10px]" [class]="statusBadgeClass(t.status)">{{ statusLabel(t.status) }}</span>
                  @if (t.priority !== 3) {
                    <span class="mc-chip !text-[10px]" [class]="priorityBadgeClass(t.priority)">{{ priorityLabel(t.priority) }}</span>
                  }
                  @if (t.attachments && t.attachments.length > 0) {
                    <span class="text-fg-subtle"><i class="fa-solid fa-paperclip"></i> {{ t.attachments.length }}</span>
                  }
                  <span class="text-fg-subtle ml-auto">Updated {{ t.updatedAt | date:'MMM d, h:mm a' }}</span>
                </div>
              </div>
              <button type="button"
                      class="opacity-0 group-hover:opacity-100 transition-opacity text-danger text-sm px-2 py-1"
                      title="Delete"
                      (click)="$event.stopPropagation(); deleteTask(t)"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>
        }
      </div>
    }
  </div>

  <!-- Edit/New task modal -->
  @if (editing()) {
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div class="mc-card w-full max-w-xl max-h-[90vh] flex flex-col">
        <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 class="mc-heading text-lg font-semibold">{{ editing()!.id ? 'Edit task #' + editing()!.id : 'New task' }}</h2>
          <button class="mc-btn-ghost !px-2 !py-1 text-sm" (click)="closeEdit()" title="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="px-6 py-4 overflow-y-auto flex-1">
          <form [formGroup]="taskForm" class="space-y-4">
            <div>
              <label class="mc-label">Title</label>
              <input class="mc-input" formControlName="title" placeholder="What needs to be done?" />
              @if (taskForm.controls.title.invalid && taskForm.controls.title.touched) {
                <div class="text-xs text-danger mt-1">Title is required (max 300 chars).</div>
              }
            </div>
            <div>
              <label class="mc-label">Description</label>
              <textarea class="mc-input min-h-32" formControlName="description" placeholder="Full brief for Claude Code…"></textarea>
            </div>
            <div>
              <label class="mc-label">Notes (operator comments / worker progress)</label>
              <textarea class="mc-input min-h-20" formControlName="notes"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mc-label">Status</label>
                <select class="mc-input" formControlName="status">
                  @for (s of statuses; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
                </select>
              </div>
              <div>
                <label class="mc-label">Priority</label>
                <select class="mc-input" formControlName="priority">
                  @for (p of priorities; track p.value) { <option [value]="p.value">{{ p.label }}</option> }
                </select>
              </div>
            </div>
            @if (editing()!.attachments && editing()!.attachments!.length > 0) {
              <div>
                <label class="mc-label">Attachments</label>
                <div class="flex flex-wrap gap-2">
                  @for (a of editing()!.attachments!; track a.filename) {
                    <a [href]="a.url" target="_blank" class="mc-chip !text-xs flex items-center gap-1.5" [title]="a.originalName + ' (' + (a.size/1024 | number:'1.0-0') + ' KB)'">
                      @if (a.mimeType.startsWith('image/')) { <img [src]="a.url" class="w-4 h-4 rounded object-cover" alt="" /> }
                      @else { <i class="fa-solid fa-file"></i> }
                      <span class="truncate max-w-[160px]">{{ a.originalName }}</span>
                      <button class="text-danger" (click)="$event.preventDefault(); removeAttachment(a)" title="Remove"><i class="fa-solid fa-xmark"></i></button>
                    </a>
                  }
                </div>
              </div>
            }
            <div>
              <label class="mc-label">{{ editing()!.id ? 'Add attachments' : 'Attachments' }}</label>
              @if (pendingFiles().length > 0) {
                <div class="flex flex-wrap gap-2 mb-2">
                  @for (pf of pendingFiles(); track pf.name) {
                    <div class="mc-chip !text-xs flex items-center gap-1.5">
                      @if (pf.preview) { <img [src]="pf.preview" class="w-4 h-4 rounded object-cover" alt="" /> }
                      @else { <i class="fa-solid fa-file"></i> }
                      <span class="truncate max-w-[160px]">{{ pf.file.name }}</span>
                      <button class="text-danger" (click)="removePendingFile(pf)" title="Remove"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                  }
                </div>
              }
              <div class="flex items-center gap-2">
                <input type="file" multiple accept="image/*,.pdf,.txt,.csv,.json" (change)="onFiles($event)" class="text-sm flex-1" />
                <button type="button" class="mc-btn-ghost !px-3 !py-1.5" (click)="pasteFromClipboard()" title="Paste from clipboard"><i class="fa-solid fa-clipboard"></i></button>
              </div>
              @if (uploading()) { <div class="text-xs text-fg-muted mt-1">Uploading…</div> }
            </div>
            @if (editError()) { <div class="text-sm text-danger">{{ editError() }}</div> }
          </form>
        </div>
        @if (editing()!.id && editing()!.status === 'DEFERRED') {
          <div class="px-6 py-3 border-t border-amber-500/20 bg-amber-500/5">
            <div class="text-sm font-medium text-amber-400 mb-2">Worker needs your input</div>
            @if (editing()!.notes) {
              <div class="text-xs text-fg-muted mb-3 whitespace-pre-wrap bg-black/20 rounded p-3">{{ editing()!.notes }}</div>
            }
            <div class="space-y-2">
              <textarea class="mc-input min-h-20 border-amber-500/30"
                        [(ngModel)]="deferredReply"
                        placeholder="Type your reply to the worker…"></textarea>
              <div class="flex items-center justify-end gap-2">
                <button class="mc-btn-primary !px-3 !py-1.5 bg-amber-600 hover:bg-amber-500 border-amber-500"
                        [disabled]="deferredReplyLoading() || !deferredReply.trim()"
                        (click)="submitDeferredReply()"
                        [title]="deferredReplyLoading() ? 'Sending…' : (!deferredReply.trim() ? 'Reply - type a message first' : 'Reply and resume')">
                  @if (deferredReplyLoading()) { <i class="fa-solid fa-spinner fa-spin"></i> } @else { <i class="fa-solid fa-reply"></i> }
                </button>
              </div>
            </div>
          </div>
        }
        @if (editing()!.id && editing()!.status === 'COMPLETED') {
          <div class="px-6 py-3 border-t border-white/5">
            @if (!showChallengeInput()) {
              <button class="mc-btn-ghost !px-3 !py-2 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/10"
                      (click)="showChallengeInput.set(true)" title="Challenge this task">
                <i class="fa-solid fa-flag"></i>
              </button>
            } @else {
              <div class="space-y-2">
                <label class="mc-label text-yellow-400">Challenge note - explain what needs fixing</label>
                <textarea class="mc-input min-h-20 border-yellow-500/30"
                          [(ngModel)]="challengeNote"
                          placeholder="Describe what is wrong with the completed result…"></textarea>
                @if (challengeError()) { <div class="text-sm text-danger">{{ challengeError() }}</div> }
                <div class="flex items-center justify-end gap-2">
                  <button class="mc-btn-ghost !px-3 !py-1.5" (click)="cancelChallenge()" title="Cancel challenge"><i class="fa-solid fa-xmark"></i></button>
                  <button class="mc-btn-primary !px-3 !py-1.5 bg-yellow-600 hover:bg-yellow-500 border-yellow-500"
                          [disabled]="challengeLoading() || !challengeNote.trim()"
                          (click)="submitChallenge()"
                          [title]="challengeLoading() ? 'Sending…' : (!challengeNote.trim() ? 'Challenge - describe what needs fixing first' : 'Send back to queue')">
                    @if (challengeLoading()) { <i class="fa-solid fa-spinner fa-spin"></i> } @else { <i class="fa-solid fa-flag"></i> }
                  </button>
                </div>
              </div>
            }
          </div>
        }
        <div class="px-6 py-3 border-t border-white/5 flex items-center justify-end gap-2">
          <button class="mc-btn-ghost !px-3 !py-2" (click)="closeEdit()" title="Cancel"><i class="fa-solid fa-xmark"></i></button>
          <button class="mc-btn-primary !px-3 !py-2" [disabled]="saving() || taskForm.invalid" (click)="saveTask()"
                  [title]="saving() ? 'Saving…' : (taskForm.invalid ? 'Save - fix validation errors first' : 'Save')">
            @if (saving()) { <i class="fa-solid fa-spinner fa-spin"></i> } @else { <i class="fa-solid fa-check"></i> }
          </button>
        </div>
      </div>
    </div>
  }

  <!-- Templates modal -->
  @if (showTemplates()) {
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div class="mc-card w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 class="mc-heading text-lg font-semibold">Prompt templates</h2>
          <button class="mc-btn-ghost !px-2 !py-1 text-sm" (click)="closeTemplates()" title="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="px-6 py-4 overflow-y-auto flex-1 space-y-3">
          @for (t of templates(); track t.id) {
            <div class="mc-card-hover p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="font-semibold">{{ t.name }}</div>
                  @if (t.description) { <div class="text-xs text-fg-muted">{{ t.description }}</div> }
                  <pre class="text-xs text-fg-muted mt-2 line-clamp-3 whitespace-pre-wrap">{{ t.content }}</pre>
                </div>
                <div class="flex flex-col gap-1">
                  <button class="mc-btn-primary !px-3 !py-1" (click)="useTemplate(t)" title="Use template"><i class="fa-solid fa-check"></i></button>
                  <button class="mc-btn-ghost !px-3 !py-1 text-danger" (click)="deleteTemplate(t)" title="Delete template"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
            </div>
          }
          @if (templates().length === 0) { <div class="text-sm text-fg-muted text-center py-8">No templates yet.</div> }

          <!-- Inline create -->
          @if (showCreateTemplate()) {
            <div class="mc-card p-4 space-y-3 border-2 border-brand/30">
              <input class="mc-input" placeholder="Template name" [(ngModel)]="newTemplateName" />
              <input class="mc-input" placeholder="Short description (optional)" [(ngModel)]="newTemplateDescription" />
              <textarea class="mc-input min-h-32" placeholder="Prompt content…" [(ngModel)]="newTemplateContent"></textarea>
              <div class="flex items-center justify-end gap-2">
                <button class="mc-btn-ghost !px-3 !py-1.5" (click)="showCreateTemplate.set(false)" title="Cancel"><i class="fa-solid fa-xmark"></i></button>
                <button class="mc-btn-primary !px-3 !py-1.5" [disabled]="!newTemplateName || !newTemplateContent" (click)="createTemplate()" [title]="!newTemplateName || !newTemplateContent ? 'Save - fill in name and content first' : 'Save'"><i class="fa-solid fa-check"></i></button>
              </div>
            </div>
          }
        </div>
        <div class="px-6 py-3 border-t border-white/5 flex items-center justify-end">
          @if (!showCreateTemplate()) {
            <button class="mc-btn-primary !px-3 !py-1.5" (click)="showCreateTemplate.set(true)" title="New template"><i class="fa-solid fa-plus"></i></button>
          }
        </div>
      </div>
    </div>
  }
  `,
})
export class ClaudePage implements OnInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private eventSource: EventSource | null = null;
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);

  protected readonly statuses = STATUS_OPTIONS;
  protected readonly priorities = PRIORITY_OPTIONS;

  protected readonly allTasks = signal<ClaudeTask[]>([]);
  protected readonly loading = signal(false);
  protected readonly statusFilter = signal<string>('not_completed');
  protected readonly orderBy = signal<string>('priority');
  protected readonly lastCompleted = signal<number>(10);

  protected readonly editing = signal<Partial<ClaudeTask> | null>(null);
  protected readonly editError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly pendingFiles = signal<{ file: File; name: string; preview: string | null }[]>([]);

  protected readonly showTemplates = signal(false);
  protected readonly showCreateTemplate = signal(false);
  protected readonly templates = signal<ClaudePromptTemplate[]>([]);
  protected newTemplateName = '';
  protected newTemplateDescription = '';
  protected newTemplateContent = '';

  // Deferred reply state
  protected readonly deferredReplyLoading = signal(false);
  protected deferredReply = '';

  // Challenge state
  protected readonly showChallengeInput = signal(false);
  protected readonly challengeLoading = signal(false);
  protected readonly challengeError = signal<string | null>(null);
  protected challengeNote = '';

  // Worker settings (toggles)
  protected readonly settingsWorkerActive = signal(false);
  protected readonly settingsScannerActive = signal(false);
  protected readonly settingsDeployNext = signal(false);

  protected readonly taskForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(300)]],
    description: [''],
    notes: [''],
    status: ['PENDING' as ClaudeTaskStatus],
    priority: [3 as ClaudeTaskPriority],
  });

  protected readonly filteredTasks = computed(() => {
    const f = this.statusFilter();
    const order = this.orderBy();
    const tasks = this.allTasks();
    let working = tasks;
    const isTerminal = (s: ClaudeTaskStatus) =>
      s === 'COMPLETED' || s === 'CANCELLED' || s === 'FAILED';
    if (f === 'not_completed') {
      working = tasks.filter((t) => !isTerminal(t.status));
    } else if (f) {
      working = tasks.filter((t) => t.status === f);
    }
    const sorter = (a: ClaudeTask, b: ClaudeTask) => {
      switch (order) {
        case 'newest':  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'updated': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default: // priority
          if (a.priority !== b.priority) return a.priority - b.priority;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    };
    // Trim the terminal tail to lastCompleted; active always shown.
    // TO_BE_DEPLOYED sits between active and terminal rows.
    const completed = working.filter((t) => isTerminal(t.status)).sort(sorter);
    const toDeploy = working.filter((t) => t.status === 'TO_BE_DEPLOYED').sort(sorter);
    const active = working.filter((t) => !isTerminal(t.status) && t.status !== 'TO_BE_DEPLOYED').sort(sorter);
    return [...active, ...toDeploy, ...completed.slice(0, this.lastCompleted())];
  });

  ngOnInit() {
    this.loadTasks();
    this.loadSettings();
    this.connectSSE();
  }

  ngOnDestroy() {
    this.eventSource?.close();
  }

  private connectSSE() {
    this.zone.runOutsideAngular(() => {
      const raw = localStorage.getItem('mc.auth.v1');
      const token = raw ? (JSON.parse(raw) as { accessToken?: string }).accessToken ?? '' : '';
      const es = new EventSource(`${this.api.base}/claude-tasks/events?token=${encodeURIComponent(token)}`);
      es.onmessage = (ev) => this.zone.run(() => {
        const prev = this.allTasks().map((t) => `${t.id}:${t.status}`).join(',');
        this.loadTasks();
        // Show notification for non-heartbeat events
        try {
          const data = JSON.parse(ev.data);
          if (!data.heartbeat) {
            this.notify.success('Task list updated.');
          }
        } catch { /* non-JSON event */ }
      });
      es.onerror = () => {
        es.close();
        setTimeout(() => this.connectSSE(), 5000);
      };
      this.eventSource = es;
    });
  }

  protected countOf(status: ClaudeTaskStatus): number {
    return this.allTasks().filter((t) => t.status === status).length;
  }

  loadTasks() {
    this.loading.set(true);
    this.api.get<ClaudeTask[]>('/claude-tasks').subscribe({
      next: (rows) => { this.allTasks.set(rows); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadSettings() {
    this.api.get<{ workerActive: boolean; scannerActive: boolean; deployNext: boolean }>('/claude-tasks/settings').subscribe({
      next: (s) => {
        this.settingsWorkerActive.set(s.workerActive);
        this.settingsScannerActive.set(s.scannerActive);
        this.settingsDeployNext.set(s.deployNext);
      },
    });
  }

  toggleSetting(key: 'workerActive' | 'scannerActive' | 'deployNext', enabled: boolean) {
    // Optimistic update
    if (key === 'workerActive') this.settingsWorkerActive.set(enabled);
    if (key === 'scannerActive') this.settingsScannerActive.set(enabled);
    if (key === 'deployNext') this.settingsDeployNext.set(enabled);

    this.api.patch<{ workerActive: boolean; scannerActive: boolean; deployNext: boolean }>('/claude-tasks/settings', { [key]: enabled }).subscribe({
      next: (s) => {
        this.settingsWorkerActive.set(s.workerActive);
        this.settingsScannerActive.set(s.scannerActive);
        this.settingsDeployNext.set(s.deployNext);
      },
      error: () => {
        // Revert on failure
        if (key === 'workerActive') this.settingsWorkerActive.set(!enabled);
        if (key === 'scannerActive') this.settingsScannerActive.set(!enabled);
        if (key === 'deployNext') this.settingsDeployNext.set(!enabled);
        this.notify.error('Failed to update setting');
      },
    });
  }

  openNewTask() {
    this.editing.set({});
    this.taskForm.reset({ title: '', description: '', notes: '', status: 'PENDING', priority: 3 });
    this.editError.set(null);
    this.pendingFiles.set([]);
  }

  openEdit(t: ClaudeTask) {
    this.editing.set(t);
    this.taskForm.reset({
      title: t.title,
      description: t.description ?? '',
      notes: t.notes ?? '',
      status: t.status,
      priority: t.priority,
    });
    this.editError.set(null);
  }

  closeEdit() { this.editing.set(null); this.resetChallenge(); this.deferredReply = ''; }

  cancelChallenge() {
    this.showChallengeInput.set(false);
    this.challengeNote = '';
    this.challengeError.set(null);
  }

  private resetChallenge() {
    this.showChallengeInput.set(false);
    this.challengeLoading.set(false);
    this.challengeNote = '';
    this.challengeError.set(null);
  }

  submitDeferredReply() {
    const t = this.editing();
    if (!t?.id || !this.deferredReply.trim()) return;
    this.deferredReplyLoading.set(true);

    const existingNotes = (t.notes ?? '').trim();
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const replyEntry = `[OPERATOR REPLY ${timestamp}] ${this.deferredReply.trim()}`;
    const notes = existingNotes ? `${existingNotes}\n${replyEntry}` : replyEntry;

    this.api.patch<ClaudeTask>(`/claude-tasks/${t.id}`, { status: 'PENDING', notes }).subscribe({
      next: () => {
        this.deferredReplyLoading.set(false);
        this.deferredReply = '';
        this.notify.success(`Task #${t.id} resumed with your reply.`);
        this.closeEdit();
        this.loadTasks();
      },
      error: () => {
        this.deferredReplyLoading.set(false);
      },
    });
  }

  submitChallenge() {
    const t = this.editing();
    if (!t?.id || !this.challengeNote.trim()) return;
    this.challengeLoading.set(true);
    this.challengeError.set(null);

    const existingNotes = (t.notes ?? '').trim();
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const challengeEntry = `[CHALLENGE ${timestamp}] ${this.challengeNote.trim()}`;
    const notes = existingNotes ? `${existingNotes}\n${challengeEntry}` : challengeEntry;

    this.api.patch<ClaudeTask>(`/claude-tasks/${t.id}`, { status: 'PENDING', notes }).subscribe({
      next: () => {
        this.challengeLoading.set(false);
        this.notify.success(`Task #${t.id} challenged and sent back to queue.`);
        this.closeEdit();
        this.loadTasks();
      },
      error: (e: Error) => {
        this.challengeLoading.set(false);
        this.challengeError.set('Challenge failed: ' + e.message);
      },
    });
  }

  saveTask() {
    if (this.taskForm.invalid) { this.taskForm.markAllAsTouched(); return; }
    const v = this.taskForm.getRawValue();
    const t = this.editing();
    if (!t) return;
    this.saving.set(true); this.editError.set(null);
    const body = {
      title: v.title,
      description: v.description || null,
      notes: v.notes || null,
      status: v.status,
      priority: Number(v.priority),
    };
    const fail = (e: Error) => { this.saving.set(false); this.editError.set(e.message); };
    const done = (row: ClaudeTask) => {
      const pending = this.pendingFiles();
      if (pending.length > 0) {
        // Upload pending files to the newly created task.
        const files = pending.map((pf) => pf.file);
        pending.forEach((pf) => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
        this.pendingFiles.set([]);
        this.uploadFilesToTask(row.id, files);
      }
      this.saving.set(false);
      this.closeEdit();
      this.loadTasks();
    };
    if (t.id) {
      this.api.patch<ClaudeTask>(`/claude-tasks/${t.id}`, body).subscribe({ next: done, error: fail });
    } else {
      this.api.post<ClaudeTask>(`/claude-tasks`, body).subscribe({ next: done, error: fail });
    }
  }

  deleteTask(t: ClaudeTask) {
    this.notify.confirm(
      `Delete task #${t.id}?`,
      `"${t.title}" will be removed from the queue. This cannot be undone.`,
      { confirmLabel: 'Delete', danger: true },
    ).subscribe((ok) => {
      if (!ok) return;
      this.api.delete(`/claude-tasks/${t.id}`).subscribe({
        next: () => { this.notify.success(`Task #${t.id} deleted.`); this.loadTasks(); },
        error: (e: Error) => this.notify.error('Delete failed: ' + e.message),
      });
    });
  }

  onFiles(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;
    const t = this.editing();
    if (!t) return;

    if (!t.id) {
      // New task - queue files locally until save.
      this.addPendingFiles(files);
      input.value = '';
      return;
    }

    this.uploadFilesToTask(t.id, files);
    input.value = '';
  }

  private addPendingFiles(files: File[]) {
    const newEntries = files.map((file) => {
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      return { file, name: file.name, preview };
    });
    this.pendingFiles.set([...this.pendingFiles(), ...newEntries]);
  }

  removePendingFile(pf: { file: File; name: string; preview: string | null }) {
    if (pf.preview) URL.revokeObjectURL(pf.preview);
    this.pendingFiles.set(this.pendingFiles().filter((x) => x !== pf));
  }

  async pasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/') || type === 'text/plain') {
            const blob = await item.getType(type);
            const ext = type === 'text/plain' ? 'txt' : type.split('/')[1];
            files.push(new File([blob], `paste-${Date.now()}.${ext}`, { type }));
          }
        }
      }
      if (files.length === 0) { this.notify.error('Nothing to paste from clipboard'); return; }
      const t = this.editing();
      if (!t) return;
      if (!t.id) {
        this.addPendingFiles(files);
      } else {
        this.uploadFilesToTask(t.id, files);
      }
    } catch {
      this.notify.error('Clipboard access denied or empty');
    }
  }

  private uploadFilesToTask(taskId: number, files: File[]) {
    this.uploading.set(true);
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    fetch(`${this.api.base}/claude-tasks/${taskId}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${(JSON.parse(localStorage.getItem('mc.auth.v1') || '{}') as { accessToken?: string })?.accessToken ?? ''}` },
      body: fd,
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      const updated = (await r.json()).data as ClaudeTask;
      this.editing.set(updated);
      this.uploading.set(false);
      this.loadTasks();
    }).catch((e) => { this.uploading.set(false); this.editError.set(e.message); });
  }

  removeAttachment(a: ClaudeTaskAttachment) {
    const t = this.editing();
    if (!t?.id) return;
    // The filename in storage is "claude-tasks-<id>/<hash>.ext"; we use the
    // basename for the URL segment.
    const basename = a.filename.split('/').pop()!;
    this.api.delete(`/claude-tasks/${t.id}/attachments/${basename}`).subscribe({
      next: () => {
        const remaining = (t.attachments ?? []).filter((x) => x.filename !== a.filename);
        this.editing.set({ ...t, attachments: remaining });
        this.loadTasks();
      },
    });
  }

  // Templates ----------------------------------------------------------------
  openTemplates() {
    this.showTemplates.set(true);
    this.showCreateTemplate.set(false);
    this.api.get<ClaudePromptTemplate[]>('/claude-prompt-templates').subscribe({
      next: (rows) => this.templates.set(rows),
    });
  }
  closeTemplates() { this.showTemplates.set(false); }
  createTemplate() {
    if (!this.newTemplateName.trim() || !this.newTemplateContent.trim()) return;
    this.api.post<ClaudePromptTemplate>('/claude-prompt-templates', {
      name: this.newTemplateName.trim(),
      description: this.newTemplateDescription.trim() || null,
      content: this.newTemplateContent,
    }).subscribe({
      next: (created) => {
        this.templates.set([created, ...this.templates()]);
        this.newTemplateName = ''; this.newTemplateDescription = ''; this.newTemplateContent = '';
        this.showCreateTemplate.set(false);
      },
    });
  }
  deleteTemplate(t: ClaudePromptTemplate) {
    this.notify.confirm(
      `Delete template?`,
      `"${t.name}" will be removed. This cannot be undone.`,
      { confirmLabel: 'Delete', danger: true },
    ).subscribe((ok) => {
      if (!ok) return;
      this.api.delete(`/claude-prompt-templates/${t.id}`).subscribe({
        next: () => {
          this.templates.set(this.templates().filter((x) => x.id !== t.id));
          this.notify.success(`Template "${t.name}" deleted.`);
        },
        error: (e: Error) => this.notify.error('Delete failed: ' + e.message),
      });
    });
  }
  useTemplate(t: ClaudePromptTemplate) {
    this.closeTemplates();
    this.openNewTask();
    this.taskForm.patchValue({ title: t.name, description: t.content });
  }

  // Style helpers ------------------------------------------------------------
  protected statusIcon(s: ClaudeTaskStatus): string {
    return {
      PENDING: 'fa-solid fa-hourglass-half text-yellow-500',
      IN_PROGRESS: 'fa-solid fa-arrows-rotate fa-spin text-blue-400',
      TO_BE_DEPLOYED: 'fa-solid fa-rocket text-purple-400',
      COMPLETED: 'fa-solid fa-check text-green-500',
      CANCELLED: 'fa-solid fa-xmark text-gray-400',
      FAILED: 'fa-solid fa-triangle-exclamation text-red-500',
      DEFERRED: 'fa-solid fa-comment text-amber-400',
    }[s];
  }
  protected statusLabel(s: ClaudeTaskStatus): string {
    return STATUS_OPTIONS.find((x) => x.value === s)?.label ?? s;
  }
  protected priorityLabel(p: ClaudeTaskPriority): string {
    return PRIORITY_OPTIONS.find((x) => x.value === p)?.label ?? `Priority ${p}`;
  }
  protected statusBadgeClass(s: ClaudeTaskStatus): string {
    return {
      PENDING:        'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
      IN_PROGRESS:    'border-blue-500/30 bg-blue-500/10 text-blue-300',
      TO_BE_DEPLOYED: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
      COMPLETED:      'border-green-500/30 bg-green-500/10 text-green-300',
      CANCELLED:      'border-gray-500/30 bg-gray-500/10 text-gray-300',
      FAILED:         'border-red-500/30 bg-red-500/10 text-red-300',
      DEFERRED:       'border-amber-500/30 bg-amber-500/10 text-amber-300',
    }[s];
  }
  protected priorityBadgeClass(p: ClaudeTaskPriority): string {
    return {
      1: 'border-red-500/30 bg-red-500/10 text-red-300',
      2: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
      3: 'border-gray-500/30 bg-gray-500/10 text-gray-300',
      4: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    }[p];
  }
}
