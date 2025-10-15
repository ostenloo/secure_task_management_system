import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { combineLatest, firstValueFrom, map, Subscription, finalize } from 'rxjs';
import { TaskPriority, TaskStatus } from '@org/data';
import { AuthService } from '../../core/auth.service';
import { DueFilter, TaskFilter, TaskModel, TaskService } from '../../core/task.service';
import { TaskFormComponent, TaskFormPayload } from './task-form.component';
import { TaskFiltersComponent } from './task-filters.component';
import { TaskCardComponent } from '../../shared/task-card.component';
import { AccountService, InviteUserResponse } from '../../core/account.service';
import { OrgContextService } from '../../core/org-context.service';
import { UsersService, UserListItem } from '../../core/users.service';

interface ColumnViewModel {
  status: TaskStatus;
  label: string;
  accent: string;
  tasks: TaskModel[];
}

interface DashboardStats {
  total: number;
  active: number;
  completed: number;
  overdue: number;
}

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DragDropModule,
    TaskFormComponent,
    TaskFiltersComponent,
    TaskCardComponent,
    AsyncPipe,
    FormsModule,
  ],
  template: `
    <div class="min-h-screen bg-surface-100 text-slate-800">
      <header class="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-primary-600">Secure Task Management</p>
            <h1 class="mt-1 text-2xl font-semibold text-slate-900">{{ orgName() }}</h1>
          </div>
          <div class="flex items-center gap-4 text-sm text-slate-600">
            <div class="text-right">
              <p class="font-medium text-slate-900">{{ vm().user?.firstName || vm().user?.email }}</p>
              <p class="text-xs capitalize">{{ vm().user?.roleName || 'user' }}</p>
            </div>
            <a routerLink="/organizations" class="btn-outline">Organizations</a>
            <a *ngIf="!isViewer()" [routerLink]="['/', orgSlug(), 'users']" class="btn-outline">Users</a>
            <button *ngIf="hasPermission('users:invite')" class="btn-primary" (click)="openInvite()">Invite</button>
            <button class="btn-outline" (click)="logout()">Sign out</button>
          </div>
        </div>
      </header>

      <main class="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <section class="lg:w-72 flex-shrink-0 space-y-6">
          <app-task-filters
            *ngIf="vm().filter"
            [filter]="vm().filter"
            [statuses]="statuses"
            (filterChange)="onFilterChange($event)"
            (reset)="resetFilters()"
          ></app-task-filters>

          <div class="card p-4 space-y-2 text-sm text-slate-600" *ngIf="isViewer()">
            <p class="text-sm font-semibold text-slate-900">Viewer role</p>
            <p>You can drag tasks between columns to update their status.</p>
          </div>
        </section>

        <section class="flex-1 space-y-6 overflow-hidden pb-12">
          <div *ngIf="!vm().loading; else statsLoading" class="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
            <div class="card px-4 py-5">
              <p class="text-xs uppercase text-slate-500">Total Tasks</p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">{{ vm().stats.total }}</p>
            </div>
            <div class="card px-4 py-5">
              <p class="text-xs uppercase text-slate-500">In Progress</p>
              <p class="mt-2 text-2xl font-semibold text-sky-600">{{ vm().stats.active }}</p>
            </div>
            <div class="card px-4 py-5">
              <p class="text-xs uppercase text-slate-500">Completed</p>
              <p class="mt-2 text-2xl font-semibold text-emerald-600">{{ vm().stats.completed }}</p>
            </div>
            <div class="card px-4 py-5">
              <p class="text-xs uppercase text-slate-500">Overdue</p>
              <p class="mt-2 text-2xl font-semibold text-rose-600">{{ vm().stats.overdue }}</p>
            </div>
          </div>
          <ng-template #statsLoading>
            <div class="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
              <div class="card px-4 py-5 animate-pulse"><div class="h-4 w-24 bg-slate-200 rounded"></div><div class="mt-3 h-6 w-16 bg-slate-200 rounded"></div></div>
              <div class="card px-4 py-5 animate-pulse"><div class="h-4 w-24 bg-slate-200 rounded"></div><div class="mt-3 h-6 w-16 bg-slate-200 rounded"></div></div>
              <div class="card px-4 py-5 animate-pulse"><div class="h-4 w-24 bg-slate-200 rounded"></div><div class="mt-3 h-6 w-16 bg-slate-200 rounded"></div></div>
              <div class="card px-4 py-5 animate-pulse"><div class="h-4 w-24 bg-slate-200 rounded"></div><div class="mt-3 h-6 w-16 bg-slate-200 rounded"></div></div>
            </div>
          </ng-template>

          

          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-900">Task Board</h2>
            <button class="btn-primary" (click)="openCreate()" *ngIf="canCreateInCurrentOrg()">New Task</button>
          </div>

          <ng-template #boardLoading>
            <div class="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
              <div *ngFor="let _ of [0,1,2,3]" class="card p-4 animate-pulse">
                <div class="h-5 w-24 bg-slate-200 rounded mb-4"></div>
                <div class="space-y-3">
                  <div class="h-16 w-full bg-slate-100 rounded"></div>
                  <div class="h-16 w-full bg-slate-100 rounded"></div>
                  <div class="h-16 w-full bg-slate-100 rounded"></div>
                </div>
              </div>
            </div>
          </ng-template>

          <div *ngIf="!vm().loading; else boardLoading" class="grid gap-4 lg:grid-cols-4 md:grid-cols-2" cdkDropListGroup>
            <div
              *ngFor="let column of vm().columns"
              class="card flex h-full flex-col gap-4 p-4 border-t-4"
              [ngClass]="column.accent"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ column.label }}</p>
                  <p class="text-xs text-slate-500">{{ column.tasks.length }} tasks</p>
                </div>
                <button
                  class="text-xs text-primary-600 hover:text-primary-700"
                  (click)="openCreate(column.status)"
                  type="button"
                  *ngIf="canCreateInCurrentOrg()"
                >
                  + Add
                </button>
              </div>

              <div
                cdkDropList
                [cdkDropListData]="column.tasks"
                class="flex flex-1 flex-col gap-3"
                (cdkDropListDropped)="onDrop($event, column.status)"
              >
                <div *ngIf="column.tasks.length === 0" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                  No tasks yet.
                </div>
                <div *ngFor="let task of column.tasks; trackBy: trackTask" cdkDrag [cdkDragData]="task">
                  <app-task-card
                    [task]="task"
                    [canEdit]="canEditTask(task)"
                    [canDelete]="canDeleteInCurrentOrg()"
                    (edit)="openEdit($event)"
                    (remove)="confirmDelete($event)"
                  ></app-task-card>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div
        class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        *ngIf="formOpen()"
        (click)="closeForm()"
      ></div>

      <section
        class="fixed right-0 top-0 z-50 h-full w-full max-w-md translate-x-0 border-l border-slate-200 bg-white shadow-2xl shadow-slate-300/60 transition-transform"
        *ngIf="formOpen()"
      >
        <header class="border-b border-slate-200 px-6 py-5">
          <h2 class="text-lg font-semibold text-slate-900">
            {{ editingTask() ? 'Edit Task' : 'Create Task' }}
          </h2>
          <p class="text-xs text-slate-500">All changes are audited automatically.</p>
        </header>
        <div class="h-full overflow-y-auto px-6 py-6">
          <div *ngIf="!submitting() && formError()" class="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {{ formError() }}
          </div>
          <app-task-form
            [statuses]="statuses"
            [priorities]="priorities"
            [initialTask]="editingTask()"
            [defaultStatus]="defaultStatus()"
            [mode]="editingTask() ? 'edit' : 'create'"
            [users]="users()"
            [canAssign]="canAssignInCurrentOrg()"
            (cancel)="closeForm()"
            (submit)="handleFormSubmit($event)"
          ></app-task-form>
        </div>
      </section>

      <!-- Invite modal overlay -->
      <div
        class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        *ngIf="inviteOpen()"
        (click)="closeInvite()"
      ></div>
      <!-- Invite centered modal -->
      <section
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-2xl"
        *ngIf="inviteOpen()"
      >
        <header class="border-b border-slate-200 px-6 py-4">
          <h2 class="text-lg font-semibold text-slate-900">Invite User</h2>
          <p class="text-xs text-slate-500">Invite a viewer or admin by email.</p>
        </header>
        <div class="px-6 py-5 space-y-4">
          <div *ngIf="inviteError()" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {{ inviteError() }}
          </div>
          <div *ngIf="inviteSuccess()" class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Invitation sent to <strong>{{ inviteSuccess()!.email }}</strong>.
            They will join the organization after they accept the invitation.
          </div>
          <form class="space-y-3" (ngSubmit)="inviteUser()">
            <div class="space-y-2">
              <label class="text-sm font-semibold text-slate-700" for="invite-email">Email</label>
              <input id="invite-email" name="inviteEmail" type="email" class="input" [(ngModel)]="inviteForm.email" required />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-semibold text-slate-700" for="invite-role">Role</label>
              <select id="invite-role" name="inviteRole" class="input" [(ngModel)]="inviteForm.role">
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="flex items-center justify-end gap-2 text-sm">
              <button type="button" class="btn-outline" (click)="closeInvite()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="inviteLoading()">
                <span *ngIf="!inviteLoading()">Send invite</span>
                <span *ngIf="inviteLoading()" class="flex items-center gap-2">
                  <span class="h-4 w-4 border-2 border-white/60 border-t-white rounded-full animate-spin"></span>
                  Sending
                </span>
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  `,
})
export class TaskBoardComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly tasks = inject(TaskService);
  private readonly accounts = inject(AccountService);
  private readonly org = inject(OrgContextService);
  private readonly usersService = inject(UsersService);

  readonly statuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE];
  readonly priorities = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.URGENT];

  readonly formOpen = signal(false);
  readonly editingTask = signal<TaskModel | null>(null);
  readonly defaultStatus = signal<TaskStatus>(TaskStatus.TODO);
  readonly formError = signal('');

  readonly organizationLoading = signal(false);
  readonly organizationMessage = signal('');
  readonly inviteLoading = signal(false);
  readonly inviteError = signal('');
  readonly inviteSuccess = signal<InviteUserResponse | null>(null);
  readonly assignAdminLoading = signal(false);
  readonly assignAdminMessage = signal('');

  organizationForm = {
    name: '',
    description: '',
  };

  inviteForm: { email: string; role: 'viewer' | 'admin' } = {
    email: '',
    role: 'viewer',
  };

  readonly inviteOpen = signal(false);

  assignAdminId = '';

  private readonly subscription = new Subscription();
  readonly users = signal<UserListItem[]>([]);
  readonly submitting = signal(false);

  readonly vm = signal({
    columns: [] as ColumnViewModel[],
    stats: { total: 0, active: 0, completed: 0, overdue: 0 } as DashboardStats,
    filter: {
      status: 'all',
      due: 'all' as DueFilter,
    } as TaskFilter,
    user: this.auth.currentUser,
    loading: true,
  });

  // Org-scoped UI gating derived from current org membership (via users list)
  readonly currentOrgRole = computed<null | 'owner' | 'admin' | 'viewer'>(() => {
    const meId = this.vm().user?.id;
    const list = this.users();
    const self = meId ? list.find((u) => u.id === meId) : undefined;
    const role = (self?.role || '').toLowerCase();
    return role === 'owner' || role === 'admin' || role === 'viewer' ? (role as any) : null;
  });
  readonly isViewer = computed(() => this.currentOrgRole() === 'viewer');
  readonly canCreateInCurrentOrg = () => {
    const r = this.currentOrgRole();
    return r === 'owner' || r === 'admin';
  };
  readonly canDeleteInCurrentOrg = () => {
    const r = this.currentOrgRole();
    return r === 'owner' || r === 'admin';
  };
  readonly canAssignInCurrentOrg = () => {
    const r = this.currentOrgRole();
    return r === 'owner' || r === 'admin';
  };
  readonly canManageOrg = computed(() => this.hasPermission('organizations:create'));

  readonly orgName = computed(() => this.org.current?.name || 'Organization');
  readonly orgSlug = computed(() => {
    const name = this.org.current?.name || '';
    return name
      .toLowerCase()
      .trim()
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  });

  hasPermission(name: string): boolean {
    const perms = this.vm().user?.permissions || [];
    return perms.includes(name);
  }

  constructor() {
    const sub = combineLatest([
      this.tasks.tasks$,
      this.tasks.filteredTasks$,
      this.tasks.filter$,
      this.auth.user$,
      this.tasks.loading$,
    ])
      .pipe(
        map(([allTasks, filtered, filter, user, loading]) => ({
          columns: this.buildColumns(filtered),
          stats: this.computeStats(allTasks),
          filter,
          user,
          loading,
        }))
      )
      .subscribe((state) => this.vm.set(state));
    this.subscription.add(sub);
  }

  ngOnInit(): void {
    this.subscription.add(
      this.usersService.listUsers().subscribe({
        next: (users) => this.users.set(users),
        error: () => this.users.set([]),
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  logout(): void {
    this.auth.logout();
  }

  openInvite(): void {
    if (!this.hasPermission('users:invite')) return;
    this.inviteError.set('');
    this.inviteSuccess.set(null);
    this.inviteOpen.set(true);
  }

  closeInvite(): void {
    this.inviteOpen.set(false);
  }

  onFilterChange(update: TaskFilter): void {
    this.tasks.setFilter(update);
  }

  resetFilters(): void {
    this.tasks.resetFilters();
  }

  openCreate(status: TaskStatus = TaskStatus.TODO): void {
    if (!this.canCreateInCurrentOrg()) return;
    this.defaultStatus.set(status);
    this.editingTask.set(null);
    this.formError.set('');
    this.formOpen.set(true);
  }

  openEdit(task: TaskModel): void {
    if (!this.canEditTask(task)) return;
    this.editingTask.set(task);
    this.defaultStatus.set(task.status);
    this.formError.set('');
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingTask.set(null);
    this.formError.set('');
  }

  handleFormSubmit(payload: TaskFormPayload): void {
    // Creating requires manage permission; editing is allowed if user can edit the specific task
    if (!this.editingTask()) {
      if (!this.canCreateInCurrentOrg()) {
        this.closeForm();
        return;
      }
    } else {
      if (!this.canEditTask(this.editingTask()!)) {
        this.closeForm();
        return;
      }
    }

    if (this.editingTask()) {
      this.submitting.set(true);
      const sub = this.tasks
      .update(this.editingTask()!.id, {
        title: payload.title,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        category: payload.category,
        dueDate: payload.dueDate ?? undefined,
        tags: payload.tags,
        // Prevent viewers from attempting to reassign; omit assigneeId changes unless allowed
        ...(this.canAssignInCurrentOrg() ? { assigneeId: payload.assigneeId ?? null } : {}),
      })
        .pipe(finalize(() => this.submitting.set(false)))
        .subscribe({
          next: () => this.closeForm(),
          error: (err) => {
            this.formError.set(this.formatError(err, 'Unable to update task.'));
          },
        });
      this.subscription.add(sub);
      return;
    }

    this.submitting.set(true);
    const sub = this.tasks
      .create({
        title: payload.title,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        category: payload.category,
        dueDate: payload.dueDate ?? undefined,
        tags: payload.tags,
        ...(this.canAssignInCurrentOrg() ? { assigneeId: payload.assigneeId ?? undefined } : {}),
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => this.closeForm(),
        error: (err) => {
          this.formError.set(this.formatError(err, 'Unable to create task.'));
        },
      });
    this.subscription.add(sub);
  }

  canEditTask(task: TaskModel): boolean {
    const role = this.currentOrgRole();
    if (role === 'owner' || role === 'admin') return true;
    const currentUserId = this.vm().user?.id;
    return role === 'viewer' && !!currentUserId && task.assigneeId === currentUserId;
  }

  confirmDelete(task: TaskModel): void {
    if (!this.canDeleteInCurrentOrg()) return;
    const confirmed = window.confirm(`Delete task "${task.title}"?`);
    if (!confirmed) return;
    const sub = this.tasks.remove(task.id).subscribe({
      error: (err) => {
        this.formError.set(this.formatError(err, 'Unable to delete task.'));
      },
    });
    this.subscription.add(sub);
  }

  onDrop(event: CdkDragDrop<TaskModel[]>, status: TaskStatus): void {
    const task = event.item.data as TaskModel | undefined;
    if (!task) return;
    if (task.status === status && event.previousIndex === event.currentIndex) {
      return;
    }
    const sub = this.tasks.moveTask(task.id, status, event.currentIndex).subscribe({
      error: (err) => {
        this.formError.set(this.formatError(err, 'Unable to move task.'));
        this.tasks.refresh();
      },
    });
    this.subscription.add(sub);
  }

  trackTask(_: number, task: TaskModel): string {
    return task.id;
  }

  private formatError(err: any, fallback = 'Something went wrong.'): string {
    const m = err?.error?.message ?? err?.message;
    if (Array.isArray(m)) return m.join('. ');
    if (typeof m === 'string' && m.trim().length > 0) return m;
    return fallback;
  }

  async createOrganization(): Promise<void> {
    if (!this.hasPermission('organizations:create')) return;
    this.organizationMessage.set('');
    this.organizationLoading.set(true);
    try {
      const payload = {
        name: this.organizationForm.name.trim(),
        description: this.organizationForm.description?.trim() || undefined,
      };
      if (!payload.name) {
        throw new Error('Organization name is required.');
      }
      await firstValueFrom(this.accounts.createOrganization(payload));
      this.organizationMessage.set('Organization created successfully.');
      this.organizationForm = { name: '', description: '' };
    } catch (error: any) {
      const message = this.formatError(error, 'Unable to create organization.');
      this.organizationMessage.set(message);
    } finally {
      this.organizationLoading.set(false);
    }
  }

  async inviteUser(): Promise<void> {
    if (!this.hasPermission('users:invite')) return;
    this.inviteError.set('');
    this.inviteSuccess.set(null);
    this.inviteLoading.set(true);
    try {
      const email = this.inviteForm.email.trim().toLowerCase();
      if (!email) {
        throw new Error('Email is required.');
      }
      const payload = {
        email,
        role: this.inviteForm.role,
        organizationId: this.org.current?.id,
      } as const;
      const result = await firstValueFrom(this.accounts.inviteUser(payload));
      this.inviteSuccess.set(result);
      this.inviteForm = { email: '', role: 'viewer' };
    } catch (error: any) {
      this.inviteError.set(this.formatError(error, 'Unable to send invitation.'));
    } finally {
      this.inviteLoading.set(false);
    }
  }

  async assignAdmin(): Promise<void> {
    if (!this.hasPermission('users:assign-admin')) return;
    this.assignAdminMessage.set('');
    const userId = this.assignAdminId.trim();
    if (!userId) {
      this.assignAdminMessage.set('User ID is required.');
      return;
    }
    this.assignAdminLoading.set(true);
    try {
      await firstValueFrom(this.accounts.assignAdmin(userId));
      this.assignAdminMessage.set('User promoted to admin.');
      this.assignAdminId = '';
    } catch (error: any) {
      const message = error?.error?.message || error?.message || 'Unable to promote user.';
      this.assignAdminMessage.set(message);
    } finally {
      this.assignAdminLoading.set(false);
    }
  }

  private buildColumns(tasks: TaskModel[]): ColumnViewModel[] {
    return this.statuses.map((status) => ({
      status,
      label: this.statusLabel(status),
      accent: this.statusAccent(status),
      tasks: tasks.filter((task) => task.status === status),
    }));
  }

  private computeStats(tasks: TaskModel[]): DashboardStats {
    const total = tasks.length;
    const active = tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REVIEW).length;
    const completed = tasks.filter((task) => task.status === TaskStatus.DONE).length;
    const overdue = tasks.filter((task) => task.dueDate && task.dueDate.getTime() < Date.now() && task.status !== TaskStatus.DONE).length;
    return { total, active, completed, overdue };
  }

  private statusLabel(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.TODO:
        return 'To Do';
      case TaskStatus.IN_PROGRESS:
        return 'In Progress';
      case TaskStatus.REVIEW:
        return 'Review';
      case TaskStatus.DONE:
        return 'Done';
      default:
        return status;
    }
  }

  private statusAccent(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.TODO:
        return 'border-primary-200';
      case TaskStatus.IN_PROGRESS:
        return 'border-sky-200';
      case TaskStatus.REVIEW:
        return 'border-amber-200';
      case TaskStatus.DONE:
        return 'border-emerald-200';
      default:
        return 'border-slate-200';
    }
  }
}
