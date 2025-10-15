# Secure Task Management System (NX Monorepo)

This repository contains a modular NX workspace implementing a Secure Task Management System skeleton with NestJS (API), Angular (Dashboard), and shared libraries for data contracts and RBAC helpers.

The goal is to provide a clean foundation for role-based access control (RBAC), task management, and audit logging, with a clear separation of concerns across apps and libs.

## Workspace Layout

```
org/
	apps/
		api/        # NestJS backend
		dashboard/  # Angular frontend
	libs/
		data/       # Shared TypeScript interfaces & DTOs
		auth/       # Reusable RBAC decorators and guards
```

## Setup

Prerequisites: Node.js 18+, npm, macOS/Linux recommended.

1. Install dependencies

```bash
cd org
npm install
```

2. Create environment file

`org/.env` already exists with sensible defaults. Review and adjust as needed:

```
DB_PATH=data/stms.db
JWT_SECRET=change-me
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=change-me
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:4200
```

3. Run the apps

```bash
cd org
npx nx serve api
# in another terminal
npx nx serve dashboard
```

4. Build all projects

```bash
cd org
 npx nx run-many --target=build --all
```

## Using the Dashboard

1. Start the API (`npx nx serve api`) and the Angular app (`npx nx serve dashboard`).
2. Visit `http://localhost:4200/login` and sign in with the seeded admin account `owner@123.com` / `password` (run `npx nx run api:seed` if you need to reseed the database).
3. After authentication you land on the task board:
   - Owners and admins can create tasks via the **New Task** button or the contextual **Add** action in each column.
   - Viewers can drag tasks between columns to update their status; admins/owners can also edit or delete cards.
   - Filter tasks by status and due date (today, this week, overdue, or no due date) to focus on what matters most.
   - Owners get a management panel to create child organizations, invite users as viewers/admins, and promote users to admin.
   - Every change triggers audit-log entries and respects the role-specific permission set enforced by the API.

## Architecture Overview

The workspace uses Nx to manage a backend API and frontend dashboard with shared libraries:

- Backend (NestJS + TypeORM + SQLite):
	- `apps/api` hosts the Nest application, bootstrapped in `apps/api/src/main.ts` and configured via `apps/api/src/app/app.module.ts`.
	- Database configuration is defined in `apps/api/src/app/database.config.ts` and uses SQLite by default with entities auto-registered.
	- Entities live in `apps/api/src/app/entities/*` and are exported via `apps/api/src/app/entities/index.ts`.

- Frontend (Angular):
	- `apps/dashboard` hosts a Tailwind-styled Angular dashboard with JWT login, guarded routes, a Kanban-style task board (drag & drop reorder/status changes), filtering controls, and a slide-over form for create/edit/delete operations.

- Shared libraries:
	- `libs/data`: DTOs, interfaces, enums for roles, permissions, JWT payloads, and task models. This ensures strict typing and reduces duplication.
	- `libs/auth`: Decorators (`Roles`, `RequirePermissions`, `Public`) and guard shells (`RolesGuard`, `PermissionsGuard`) to centralize RBAC utilities.

## Data Model Summary

Implemented with TypeORM entities under `apps/api/src/app/entities`:

- `OrganizationEntity`: Two-level hierarchy supported via `parentId`, `parent`, and `children` relationships. Includes `isActive`, timestamps.
- `RoleEntity`: Role within an organization with `permissions` (many-to-many) and `inheritsFrom` for role inheritance. Includes `isSystemRole` to flag Owner/Admin/Viewer.
- `PermissionEntity`: Defines `resource`, `action`, optional `conditions` JSON for fine-grained control.
- `UserEntity`: Organization-bound user with secure `password` hashing, references `RoleEntity`, and basic status fields.
- `TaskEntity`: Rich task model with status, priority, category, assignee, creator, organization scope, due/completed dates, ordering, tags, archive flag, and helpful indices.
- `AuditLogEntity`: Captures user action, resource, org, metadata, and timestamp with common query indices.

Shared types in `libs/data/src/lib/interfaces.ts` mirror and extend these shapes for use across apps, including DTOs such as `CreateTaskDto` and `UpdateTaskDto`, role/permission enums, and authentication types (`LoginDto`, `AuthResponse`, `JwtPayload`).

## Access Control

RBAC utilities live in `libs/auth` and are wired globally:

- `decorators.ts` provides `Roles`, `RequirePermissions`, and `Public` decorators to annotate controllers and handlers.
- `guards.ts` exposes `JwtAuthGuard`, `RolesGuard`, and `PermissionsGuard`; they are registered as global guards in `apps/api/src/app/app.module.ts`, so every non-`@Public()` handler requires a valid JWT and permission set.
- `apps/api/src/app/auth/rbac.service.ts` hydrates role inheritance and composes the effective permission list attached to `request.user` by the JWT strategy.

Ownership and organization scoping logic lives inside the task service layer; for example, `TasksService` blocks cross-organization access and limits updates/deletes to creators or admins.

## API Endpoints

Implemented endpoints (all under `/api`):

- `GET /api` – Health message (public).
- `POST /api/auth/login` – Exchange credentials for a JWT.
- `GET /api/tasks` – Return tasks scoped to the authenticated user's organization (`tasks:read`).
- `POST /api/tasks` – Create a task with org scoping and audit logging (`tasks:create`).
- `PUT /api/tasks/:id` – Update a task if creator or admin (`tasks:update`).
- `PATCH /api/tasks/:id/status` – Move a task between columns (viewer/admin/owner via `tasks:move`).
- `DELETE /api/tasks/:id` – Delete a task if creator or admin (`tasks:delete`).
- `GET /api/audit-log` – Owner/Admin-only audit log listing.
- `POST /api/organizations` – Owners can provision additional organizations within their hierarchy.
- `POST /api/users/invite` – Owners invite viewers/admins and obtain a temporary password for the new account.
- `POST /api/users/:id/assign-admin` – Owners can promote an existing user to the admin role.

## Authentication

The API issues and validates real JWTs:

- Environment variables for JWT secrets/expirations live in `.env`.
- `AuthController` (`POST /api/auth/login`) validates credentials with bcrypt and returns `{ user, token }`.
- `JwtStrategy` verifies tokens, loads the user record, and attaches `roleName` plus the effective permission list via `RbacService`.
- Global guards ensure every protected route requires a bearer token; the Angular dashboard attaches it through an `HttpInterceptor`.

## Frontend

The Angular dashboard is production-ready for day-to-day task management:

- A light Tailwind palette highlights stats, role context, and action buttons while remaining accessible.
- The login screen authenticates against the Nest API, persists the JWT session, and guards routes via interceptors + Angular route guards.
- The Kanban board (Angular CDK drag & drop) lets viewers move cards, while admins/owners can create, edit, assign, and archive tasks via a slide-over form.
- Sidebar filters now focus on status and due-date groupings (today, this week, overdue, no due date) without additional archive toggles.
- Owners get inline account tooling to create organizations, invite users, and promote admins without leaving the board.

## Testing

- Backend: Jest E2E coverage (`apps/api-e2e`) exercises the HTTP layer; additional service/unit cases can be layered on next.
- Frontend: `apps/dashboard/src/app/features/tasks/task-form.component.spec.ts` validates the task form normalisation pipeline (trimming, tag splitting, ISO date handling). Run `npx nx test dashboard` to execute.
- Shared libs retain their existing unit coverage.

Next test targets:

- Expand backend unit tests around `AuthService`, `TasksService`, and `RbacService` (positive and negative RBAC scenarios).
- Add API E2E flows for task CRUD with seeded roles.
- Create Angular tests for `TaskBoardComponent` interactions and guard/interceptor utilities.
- Layer UI end-to-end smoke coverage (Playwright) once dashboard flows stabilise.

## File-to-Requirement Mapping

- Monorepo structure: `apps/api`, `apps/dashboard`, `libs/data`, `libs/auth`.
- Data models: `apps/api/src/app/entities/*.entity.ts` implement Users, Organizations, Roles (with inheritance), Permissions, Tasks, and Audit Logs.
- Access control: `libs/auth/src/lib/decorators.ts`, `libs/auth/src/lib/guards.ts`, and global guard wiring in `apps/api/src/app/app.module.ts` enforce JWT + RBAC on every route.
- Auth: `apps/api/src/app/auth/*` delivers login, JWT issuance, strategy validation, and role/permission enrichment.
- API endpoints: `apps/api/src/app/tasks` and `apps/api/src/app/audit-log` implement the required protected routes with audit logging.
- Frontend: `apps/dashboard` houses the login flow, interceptor/guards, and the drag-and-drop task board backed by `TaskService`.
- Testing: `apps/api-e2e` basic test; more tests to be added for RBAC/auth/endpoints and UI.

## Future Work and Considerations

- Extend authentication with refresh-token rotation, password policies, and account recovery flows.
- Enrich `PermissionsGuard` with conditional checks (resource ownership rules, attribute-based constraints) and cache effective permissions.
- Build an audit-log UI with filtering/export, plus dashboards for task analytics (burn-down, completion charts).
- Add comprehensive automated coverage: backend service tests, API e2e suites, Angular component/integration specs, and Playwright journeys.
- Harden operational posture: rate limiting, request logging, production-ready configs, containerisation, and CI pipelines.

## Running Locally

From the `org` directory:

```bash
npx nx serve api
```

In another terminal:

```bash
npx nx serve dashboard
```

Build all:

```bash
npx nx run-many --target=build --all
```

Run a sample test:

```bash
npx nx test auth
```

---

This README describes the current state of the system, the mapping between code and requirements, and the roadmap to complete the full challenge scope.
