import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrganizationsServiceClient, OrganizationItem } from '../../core/organizations.service';
import { AuthService } from '../../core/auth.service';
import { OrgContextService } from '../../core/org-context.service';

@Component({
  selector: 'app-organizations-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen bg-surface-100 text-slate-800">
      <header class="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-primary-600">Secure Task Management</p>
            <h1 class="mt-1 text-2xl font-semibold text-slate-900">Organizations</h1>
          </div>
          <nav class="flex items-center gap-2 text-sm">
            <button class="btn-outline" (click)="logout()">Sign out</button>
          </nav>
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div class="card p-6 space-y-4" *ngIf="hasPermission('organizations:create')">
          <div>
            <h3 class="text-lg font-semibold text-slate-900">Create Organization</h3>
          </div>
          <form class="space-y-3" (ngSubmit)="createOrg()">
            <div class="space-y-2">
              <label class="text-sm font-semibold text-slate-700" for="org-name">Name</label>
              <input id="org-name" name="orgName" class="input" [(ngModel)]="orgName" required />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-semibold text-slate-700" for="org-description">Description</label>
              <textarea id="org-description" name="orgDescription" class="input min-h-[100px]" [(ngModel)]="orgDescription"></textarea>
            </div>
            <div class="flex items-center justify-between text-xs text-slate-500">
              <button type="submit" class="btn-primary" [disabled]="orgLoading()">
                <span *ngIf="!orgLoading()">Create</span>
                <span *ngIf="orgLoading()" class="flex items-center gap-2">
                  <span class="h-4 w-4 border-2 border-white/60 border-t-white rounded-full animate-spin"></span>
                  Creating
                </span>
              </button>
            </div>
          </form>
          <div *ngIf="orgMessage()" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{{ orgMessage() }}</div>
        </div>

        <div class="card overflow-hidden">
          <div class="border-b border-slate-200 px-4 py-3">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-semibold text-slate-900">Your Organizations</h2>
              <div class="text-xs text-slate-500">{{ orgs().length }} orgs</div>
            </div>
          </div>
          <div *ngIf="loading()" class="p-6 text-sm text-slate-600">Loading organizations...</div>
          <div *ngIf="error()" class="m-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ error() }}</div>
          <ul *ngIf="!loading() && !error()" class="divide-y divide-slate-200 bg-white">
            <li *ngFor="let o of orgs(); trackBy: trackById" class="p-4 flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">{{ o.name }}</p>
                <p class="text-xs text-slate-500">{{ o.description || 'No description' }}</p>
                <p class="text-xs text-slate-500" *ngIf="o.role">Your role: <span class="uppercase">{{ o.role }}</span></p>
              </div>
              <a [routerLink]="['/', toSlug(o.name), 'tasks']" class="btn-primary">Open</a>
            </li>
            <li *ngIf="orgs().length === 0" class="p-6 text-center text-sm text-slate-500">No organizations found.</li>
          </ul>
        </div>

        <div class="card overflow-hidden">
          <div class="border-b border-slate-200 px-4 py-3">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-semibold text-slate-900">Invitations</h2>
              <div class="text-xs text-slate-500">{{ invitations().length }} pending</div>
            </div>
          </div>
          <ul class="divide-y divide-slate-200 bg-white">
            <li *ngFor="let inv of invitations(); trackBy: trackByInvitation" class="p-4 flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">{{ inv.organizationName }}</p>
                <p class="text-xs text-slate-500">Role: <span class="uppercase">{{ inv.role || 'viewer' }}</span></p>
              </div>
              <div class="flex items-center gap-2">
                <button class="btn-outline" (click)="decline(inv)">Decline</button>
                <button class="btn-primary" (click)="accept(inv)">Accept</button>
              </div>
            </li>
            <li *ngIf="invitations().length === 0" class="p-6 text-center text-sm text-slate-500">No invitations.</li>
          </ul>
        </div>
      </main>
    </div>
  `,
})
export class OrganizationsListComponent implements OnInit {
  private readonly api = inject(OrganizationsServiceClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly orgCtx = inject(OrgContextService);
  private readonly route = inject(ActivatedRoute);

  readonly orgs = signal<OrganizationItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly invitations = signal<Array<{ organizationId: string; organizationName: string; role: string | null; membershipId: string }>>([]);

  orgName = '';
  orgDescription = '';
  readonly orgLoading = signal(false);
  readonly orgMessage = signal('');

  ngOnInit(): void {
    const data = this.route.snapshot.data['data'];
    if (data) {
      this.orgs.set(data.orgs || []);
      this.invitations.set(data.invitations || []);
      if (data.error) this.error.set(data.error);
      this.loading.set(false);
    } else {
      // Fallback: should not happen when resolver is wired, keep legacy minimal fetch
      this.api.list().subscribe({ next: (orgs) => { this.orgs.set(orgs); this.loading.set(false); }, error: () => { this.error.set('Failed to load organizations'); this.loading.set(false); } });
      this.api.listInvitations().subscribe({ next: (items) => this.invitations.set(items) });
    }
  }

  hasPermission(name: string): boolean {
    const perms = this.auth.currentUser?.permissions || [];
    return perms.includes(name);
  }

  trackById = (_: number, o: OrganizationItem) => o.id;
  trackByInvitation = (_: number, inv: { membershipId: string }) => inv.membershipId;

  toSlug(name: string): string {
    return (name || '')
      .toLowerCase()
      .trim()
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  logout(): void {
    this.auth.logout();
  }

  createOrg(): void {
    if (!this.hasPermission('organizations:create')) return;
    const trimmed = this.orgName.trim();
    if (!trimmed) {
      this.orgMessage.set('Organization name is required');
      return;
    }
    this.orgLoading.set(true);
    this.orgMessage.set('');
    this.api.createOrganization({ name: trimmed, description: this.orgDescription?.trim() || undefined }).subscribe({
      next: () => {
        this.orgName = '';
        this.orgDescription = '';
        // Refresh org list and navigate to the new org immediately
        this.api.list().subscribe({
          next: (orgs) => {
            this.orgs.set(orgs);
            this.orgCtx.setAll(orgs);
            const created = orgs.find((o) => this.toSlug(o.name) === this.toSlug(trimmed));
            this.orgLoading.set(false);
            if (created) {
              // Set current org in context proactively for downstream pages
              // Consumers use toSlug match, but setting cache ensures no flicker
              const url = ['/', this.toSlug(created.name), 'tasks'];
              void this.router.navigate(url);
              this.orgMessage.set('Organization created. Redirecting...');
            } else {
              this.orgMessage.set('Organization created.');
            }
          },
          error: () => {
            this.orgMessage.set('Organization created, but failed to refresh list.');
            this.orgLoading.set(false);
          }
        });
      },
      error: (err) => {
        this.orgMessage.set(err?.error?.message || 'Unable to create organization');
        this.orgLoading.set(false);
      },
    });
  }

  accept(inv: { membershipId: string }) {
    this.api.acceptInvitation(inv.membershipId).subscribe({
      next: () => {
        this.api.list().subscribe({
          next: (orgs) => {
            this.orgs.set(orgs);
            this.orgCtx.setAll(orgs);
          },
        });
        this.api.listInvitations().subscribe({ next: (items) => this.invitations.set(items) });
      },
    });
  }

  decline(inv: { membershipId: string }) {
    this.api.declineInvitation(inv.membershipId).subscribe({
      next: () => {
        this.api.listInvitations().subscribe({ next: (items) => this.invitations.set(items) });
      },
    });
  }
}
