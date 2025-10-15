import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService, UserListItem } from '../../core/users.service';
import { AuthService } from '../../core/auth.service';
import { AccountService, InviteUserResponse } from '../../core/account.service';
import { OrgContextService } from '../../core/org-context.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen bg-surface-100 text-slate-800">
      <header class="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-primary-600">Secure Task Management</p>
            <h1 class="mt-1 text-2xl font-semibold text-slate-900">{{ orgName() }} — Users</h1>
          </div>
          <div class="flex items-center gap-2">
            <a [routerLink]="['/', orgSlug(), 'tasks']" class="btn-outline">Back to tasks</a>
            <button class="btn-outline" (click)="logout()">Sign out</button>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-6 py-8">
        

        <div class="card overflow-hidden">
          <div class="border-b border-slate-200 px-4 py-3">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-semibold text-slate-900">All Users</h2>
              <div class="text-xs text-slate-500">{{ users().length }} users</div>
            </div>
          </div>

          <div *ngIf="loading()" class="p-6 text-sm text-slate-600">
            Loading users...
          </div>
          <div *ngIf="error()" class="m-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {{ error() }}
          </div>

          <div class="overflow-x-auto" *ngIf="!loading() && !error()">
            <table class="min-w-full divide-y divide-slate-200">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                  <th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Email</th>
                  <th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Role</th>
                  <th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                  <th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Joined</th>
                  
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 bg-white">
                <tr *ngFor="let u of users(); trackBy: trackById">
                  <td class="whitespace-nowrap px-4 py-2">
                    <span class="font-medium text-slate-900">{{ u.firstName }} {{ u.lastName }}</span>
                  </td>
                  <td class="whitespace-nowrap px-4 py-2 text-slate-600">{{ u.email }}</td>
                  <td class="whitespace-nowrap px-4 py-2 text-slate-600 capitalize">{{ u.role || 'user' }}</td>
                  <td class="whitespace-nowrap px-4 py-2">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                      [ngClass]="u.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200'"
                    >
                      {{ u.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-4 py-2 text-slate-600">{{ formatDate(u.createdAt) }}</td>
                  
                </tr>
                <tr *ngIf="users().length === 0">
                  <td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">No users found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class UsersListComponent implements OnInit {
  private readonly api = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly org = inject(OrgContextService);

  readonly users = signal<UserListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

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

  ngOnInit(): void {
    // Data has been preloaded by the route resolver; fetch once for this view
    this.loading.set(true);
    this.api.listUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err) => {
        const msg = err?.status === 403
          ? 'You do not have permission to view users.'
          : (err?.error?.message || 'Failed to load users');
        this.error.set(msg);
        this.loading.set(false);
      },
    });
  }

  trackById = (_: number, u: UserListItem) => u.id;

  formatDate(d: string) {
    try {
      const date = new Date(d);
      return date.toLocaleDateString();
    } catch {
      return d;
    }
  }


  logout(): void {
    this.auth.logout();
  }
}
