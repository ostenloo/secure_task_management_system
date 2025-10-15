import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, of, switchMap } from 'rxjs';
import { OrganizationsServiceClient, OrganizationItem } from './organizations.service';

@Injectable({ providedIn: 'root' })
export class OrgContextService {
  private readonly org$ = new BehaviorSubject<OrganizationItem | null>(null);
  private readonly all$ = new BehaviorSubject<OrganizationItem[] | null>(null);
  private readonly api = inject(OrganizationsServiceClient);

  readonly organization$ = this.org$.asObservable();

  loadAllIfNeeded() {
    if (this.all$.value) return of(this.all$.value);
    return this.api.list().pipe(
      map((items) => {
        this.all$.next(items);
        return items;
      })
    );
  }

  // Allow components to refresh or replace the cached list after mutations
  setAll(items: OrganizationItem[]) {
    this.all$.next(items);
  }

  setBySlug(slug: string) {
    return this.loadAllIfNeeded().pipe(
      map((items) => {
        const match = (items || []).find((o) => this.toSlug(o.name) === slug);
        this.org$.next(match || null);
        return match;
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

  private toSlug(name: string): string {
    return (name || '')
      .toLowerCase()
      .trim()
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }
}
