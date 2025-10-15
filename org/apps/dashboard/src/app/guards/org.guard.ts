import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { OrgContextService } from '../core/org-context.service';
import { map } from 'rxjs/operators';

export const orgGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const orgSlug = route.paramMap.get('org');
  const orgCtx = inject(OrgContextService);
  const router = inject(Router);
  if (!orgSlug) {
    return router.createUrlTree(['/organizations']);
  }
  return orgCtx.setBySlug(orgSlug).pipe(
    map((org) => org ? true : router.createUrlTree(['/organizations']))
  );
};
