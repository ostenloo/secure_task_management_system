import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { orgGuard } from './guards/org.guard';
import { tasksResolver } from './resolvers/tasks.resolver';
import { usersResolver } from './resolvers/users.resolver';
import { organizationsResolver } from './resolvers/organizations.resolver';

export const appRoutes: Route[] = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'organizations' },
      // New org-based routes
      {
        path: ':org/tasks',
        canActivate: [authGuard, orgGuard],
        resolve: { ready: tasksResolver },
        loadComponent: () => import('./features/tasks/task-board.component').then((m) => m.TaskBoardComponent),
      },
      {
        path: ':org/users',
        canActivate: [authGuard, orgGuard],
        resolve: { ready: usersResolver },
        loadComponent: () => import('./features/users/users-list.component').then((m) => m.UsersListComponent),
      },
      {
        path: 'organizations',
        canActivate: [authGuard],
        resolve: { data: organizationsResolver },
        loadComponent: () => import('./features/organizations/organizations-list.component').then((m) => m.OrganizationsListComponent),
      },
      // Legacy route redirect for old /tasks -> go to orgs list
      { path: 'tasks', pathMatch: 'full', redirectTo: 'organizations' },
      { path: 'users', pathMatch: 'full', redirectTo: 'organizations' },
    ],
  },
  { path: '**', redirectTo: 'organizations' },
];
