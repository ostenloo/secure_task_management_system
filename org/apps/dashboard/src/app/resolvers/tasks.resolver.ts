import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { of, combineLatest } from 'rxjs';
import { catchError, filter, map, take } from 'rxjs/operators';
import { TaskService } from '../core/task.service';

// Preload tasks for the current organization (org is set by orgGuard before resolver runs)
export const tasksResolver: ResolveFn<boolean> = () => {
  const tasks = inject(TaskService);
  // Kick off a load proactively; if already loading, this will just reuse it
  const kickoff$ = tasks.load().pipe(catchError(() => of([])));
  return combineLatest([tasks.loading$, kickoff$]).pipe(
    filter(([loading]) => !loading),
    take(1),
    map(() => true),
    catchError(() => of(true))
  );
};
