import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, of } from 'rxjs';
import { OrganizationsServiceClient, OrganizationItem } from './organizations.service';
import { UserMembership } from './auth.models';

@Injectable({ providedIn: 'root' })
export class OrgContextService {
  private readonly org$ = new BehaviorSubject<OrganizationItem | null>(null);
  private readonly all$ = new BehaviorSubject<OrganizationItem[] | null>(null);
  private readonly api = inject(OrganizationsServiceClient);
  private memberships: UserMembership[] = [];

  readonly organization$ = this.org$.asObservable();

  loadAllIfNeeded() {
    if (this.all$.value) return of(this.all$.value);
    return this.api.list().pipe(
      map((items) => {
        const enriched = items.map((item) => this.mergeMembershipIntoItem(item));
        this.all$.next(enriched);
        return enriched;
      })
    );
  }

  // Allow components to refresh or replace the cached list after mutations
  setAll(items: OrganizationItem[]) {
    const enriched = items.map((item) => this.mergeMembershipIntoItem(item));
    this.all$.next(enriched);
    const currentId = this.current?.id ?? this.memberships[0]?.organizationId ?? null;
    if (currentId) {
      this.setCurrentById(currentId);
    }
  }

  setBySlug(slug: string) {
    return this.loadAllIfNeeded().pipe(
      map((items) => {
        const list = items || [];
        const match = list.find((o) => this.toSlug(o.name) === slug);
        if (match) {
          const merged = this.mergeMembershipIntoItem(match);
          this.org$.next(merged);
          return merged;
        }
        const membershipFallback = this.memberships.find((m) => this.toSlug(m.organizationName ?? '') === slug);
        if (membershipFallback) {
          const item = this.buildItemFromMembership(membershipFallback);
          this.org$.next(item);
          return item;
        }
        this.org$.next(null);
        return null;
      }),
      catchError(() => {
        this.org$.next(null);
        return of(null);
      })
    );
  }

  get current(): OrganizationItem | null {
    return this.org$.value;
  }

  setMemberships(memberships: UserMembership[]) {
    this.memberships = memberships ?? [];
    const list = this.all$.value;
    if (list) {
      this.all$.next(list.map((item) => this.mergeMembershipIntoItem(item)));
    }
    if (!this.current && this.memberships.length) {
      this.setCurrentById(this.memberships[0].organizationId);
    }
  }

  setCurrentById(orgId: string | null | undefined) {
    if (!orgId) {
      return;
    }
    const list = this.all$.value;
    const match = list?.find((o) => o.id === orgId);
    if (match) {
      this.org$.next(this.mergeMembershipIntoItem(match));
      return;
    }
    const membership = this.memberships.find((m) => m.organizationId === orgId);
    if (membership) {
      this.org$.next(this.buildItemFromMembership(membership));
    }
  }

  clear() {
    this.memberships = [];
    this.org$.next(null);
    this.all$.next(null);
  }

  hasAnyRole(role: string): boolean {
    const desired = (role || '').toLowerCase();
    return this.memberships.some((m) => (m.roleName || '').toLowerCase() === desired);
  }

  currentRoleName(): string | null {
    const currentId = this.current?.id;
    if (!currentId) return null;
    const membership = this.memberships.find((m) => m.organizationId === currentId);
    return membership?.roleName?.toLowerCase?.() ?? null;
  }

  private toSlug(name: string): string {
    return (name || '')
      .toLowerCase()
      .trim()
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  private mergeMembershipIntoItem(item: OrganizationItem): OrganizationItem {
    const membership = this.memberships.find((m) => m.organizationId === item.id);
    if (!membership) return item;
    return {
      ...item,
      role: membership.roleName ?? item.role ?? null,
    };
  }

  private buildItemFromMembership(membership: UserMembership): OrganizationItem {
    return {
      id: membership.organizationId,
      name: membership.organizationName ?? 'Organization',
      description: '',
      parentId: undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      role: membership.roleName ?? null,
    };
  }
}
