import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, map, take, tap } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';
import { OrganizationsServiceClient, OrganizationItem } from '../core/organizations.service';
import { OrgContextService } from '../core/org-context.service';

export interface OrganizationsResolveData {
  orgs: OrganizationItem[];
  invitations: Array<{ organizationId: string; organizationName: string; role: string | null; membershipId: string }>;
  error?: string;
}

export const organizationsResolver: ResolveFn<OrganizationsResolveData> = () => {
  const api = inject(OrganizationsServiceClient);
  const orgCtx = inject(OrgContextService);
  return forkJoin({ orgs: api.list(), invitations: api.listInvitations() }).pipe(
    tap(({ orgs }) => orgCtx.setAll(orgs)),
    take(1),
    catchError((err) =>
      of({
        orgs: [],
        invitations: [],
        error: err?.error?.message || 'Failed to load organizations',
      } as OrganizationsResolveData)
    ),
    map((data) => data as OrganizationsResolveData)
  );
};
