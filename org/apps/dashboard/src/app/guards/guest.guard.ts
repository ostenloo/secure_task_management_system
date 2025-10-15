import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../core/auth.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated) {
    return true;
  }

  return auth.user$.pipe(
    take(1),
    map((user) => {
      if (user) {
        return router.createUrlTree(['/tasks']);
      }
      return true;
    })
  );
};
