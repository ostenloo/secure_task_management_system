import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { UsersService } from '../core/users.service';

export const usersResolver: ResolveFn<boolean> = () => {
  const users = inject(UsersService);
  // Trigger the fetch; the component will pick up the data from the service
  return users.listUsers().pipe(
    take(1),
    map(() => true),
    catchError(() => of(true))
  );
};
