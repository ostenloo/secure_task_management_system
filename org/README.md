# Secure Task Management System

## Setup Instructions

1. **Install dependencies**

```bash
cd org
npm install
```

2. **Environment Configuration**

Create an `org/.env` file with the following configuration:

```env
# Database Configuration
DB_PATH=data/stms.db

# JWT Configuration
JWT_SECRET=your-secure-jwt-secret-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-secure-refresh-secret-here
JWT_REFRESH_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:4200
```

3. **Database Setup**

Seed the database with initial data:
```bash
cd org
npx nx run api:seed
```

### Running the Applications

**Backend API:**
```bash
cd org
npx nx serve api
```

**Frontend Dashboard:**
```bash
cd org
npx nx serve dashboard
```

**Build All Projects:**
```bash
cd org
npx nx run-many --target=build --all
```

### Access Points
- Dashboard: http://localhost:4200
- API: http://localhost:3000/api
- Default login: `owner@123.com` / `password`

## Architecture Overview

### NX Monorepo Layout and Rationale

```
org/
├── apps/
│   ├── api/                # NestJS backend application
│   ├── dashboard/          # Angular frontend application
│   ├── api-e2e/           # Backend integration tests
│   └── dashboard-e2e/     # Frontend E2E tests
├── libs/
│   ├── data/              # Shared TypeScript interfaces & DTOs
│   └── auth/              # Reusable RBAC decorators and guards
└── package.json           # Workspace dependencies
```

### Backend Architecture (NestJS)

```
apps/api/src/
├── main.ts                 # Application bootstrap
├── seed.ts                 # Database seeding utilities
└── app/
    ├── app.module.ts       # Root module with global configuration
    ├── database.config.ts  # TypeORM database configuration
    ├── entities/           # Database entity definitions
    │   ├── user.entity.ts
    │   ├── organization.entity.ts
    │   ├── role.entity.ts
    │   ├── permission.entity.ts
    │   ├── task.entity.ts
    │   └── audit-log.entity.ts
    ├── auth/              # Authentication and authorization
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── auth.module.ts
    │   ├── jwt.strategy.ts
    │   └── rbac.service.ts
    ├── tasks/             # Task management module
    ├── users/             # User management module
    ├── organizations/     # Organization management module
    └── audit-log/         # Audit logging module
```

### Frontend Architecture (Angular)

```
apps/dashboard/src/app/
├── app.config.ts          # Application configuration
├── app.routes.ts          # Route definitions with guard protection
├── core/                  # Core services and interceptors
│   ├── auth/
│   └── interceptors/
├── shared/               # Reusable components and utilities
├── features/
│   ├── auth/             # Authentication features
│   └── tasks/            # Task management features
└── guards/               # Route protection guards
```

### Shared Libraries

**`libs/data`** - Type Safety and Contracts
- Shared TypeScript interfaces between frontend and backend
- Data Transfer Objects (DTOs) for API communication
- Enums for roles, permissions, and task status
- Ensures type consistency across the entire application

**`libs/auth`** - Security Utilities
- Reusable RBAC decorators (`@Roles`, `@RequirePermissions`, `@Public`)
- Guard implementations for authentication and authorization
- Common authentication types and interfaces
- Centralized security logic

## Data Model Explanation

### Database Schema

#### Core Entities

**Organization Entity**

```typescript
OrganizationEntity {
  id: string (PK, UUID)
  name: string
  description: string (nullable)
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

**User Entity**

```typescript
UserEntity {
  id: string (PK, UUID)
  email: string (unique)
  password: string (hashed, select: false)
  firstName: string
  lastName: string
  lastLoginAt: Date (nullable)
  createdAt: Date
  updatedAt: Date
}
```

**User Organization Entity (Junction Table)**

```typescript
UserOrganizationEntity {
  id: string (PK, UUID)
  userId: string (FK → UserEntity)
  user: UserEntity
  organizationId: string (FK → OrganizationEntity) 
  organization: OrganizationEntity
  roleId: string (FK → RoleEntity)
  role: RoleEntity
  isActive: boolean (default: true)
  invitedPending: boolean (default: false)
  createdAt: Date
  updatedAt: Date
}
```

**Role Entity**

```typescript
RoleEntity {
  id: string (PK, UUID)
  name: string
  description: string (nullable)
  organizationId: string (FK)
  organization: OrganizationEntity
  permissions: PermissionEntity[] (many-to-many)
  inheritsFrom: RoleEntity[] (many-to-many)
  isSystemRole: boolean
  createdAt: Date
  updatedAt: Date
```

**Permission Entity**

```typescript
PermissionEntity {
  id: string (PK, UUID)
  name: string
  resource: string
  action: string
  conditions: Record<string, any> (nullable)
  roles: RoleEntity[] (many-to-many)
  createdAt: Date
  updatedAt: Date
}
```

**Task Entity**

```typescript
TaskEntity {
  id: string (PK, UUID)
  title: string
  description: string (nullable)
  status: string
  priority: string
  category: string (nullable)
  assigneeId: string (FK, nullable)
  assignee: UserEntity
  createdById: string (FK)
  createdBy: UserEntity
  organizationId: string (FK)
  organization: OrganizationEntity
  dueDate: Date (nullable)
  completedAt: Date (nullable)
  order: number
  tags: string[] (JSON array)
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}
```

**Audit Log Entity**

```typescript
AuditLogEntity {
  id: string (PK, UUID)
  userId: string (FK)
  user: UserEntity
  organizationId: string (FK)
  action: string
  resource: string
  resourceId: string
  details: Record<string, any> (nullable)
  ipAddress: string (nullable)
  userAgent: string (nullable)
  timestamp: Date
}
```

### Entity Relationship Diagram

(yes this was generated with AI lol)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Organization  │    │      User       │    │ UserOrganization│
│                 │    │                 │    │                 │
│ - id (PK)       │    │ - id (PK)       │    │ - id (PK)       │
│ - name          │    │ - email (unique)│    │ - userId (FK)   ├───┐
│ - description   │    │ - password      │    │ - organizationId├─┐ │
│ - isActive      │    │ - firstName     │    │ - roleId (FK)   │ │ │
│ - description   │    │ - lastName      │    │ - isActive      │ │ │
└─────────────────┘    │ - lastLoginAt   │    │ - invitedPending│ │ │
        │               └─────────────────┘    └─────────────────┘ │ │
        │                                              │           │ │
        │                                              │           │ │
        └──────────────────────────────────────────────┘           │ │
                                                                   │ │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │ │
│      Role       │    │   Permission    │    │      Task       │ │ │
│                 │    │                 │    │                 │ │ │
│ - id (PK)       │◄──┐│ - id (PK)       │    │ - id (PK)       │ │ │
│ - name          │   ││ - name          │    │ - title         │ │ │
│ - organizationId├───┼│ - resource      │    │ - status        │ │ │
│ - description   │   ││ - action        │    │ - assigneeId    ├─┘ │
│ - isSystemRole  │   ││ - conditions    │    │ - createdById   ├───┘
└─────────────────┘   │└─────────────────┘    │ - organizationId├──┐
        │             │                       │ - priority      │  │
        │ many-to-many│                       │ - category      │  │
        │             │                       │ - dueDate       │  │
        └─────────────┘                       │ - order         │  │
                                              │ - tags          │  │
                                              │ - isArchived    │  │
                                              └─────────────────┘  │
                                                      │             │
                                                      │             │
                                              ┌─────────────────┐  │
                                              │   AuditLog      │  │
                                              │                 │  │
                                              │ - id (PK)       │  │
                                              │ - userId (FK)   ├──┘
                                              │ - organizationId├────┘
                                              │ - action        │
                                              │ - resource      │
                                              │ - resourceId    │
                                              │ - details       │
                                              │ - ipAddress     │
                                              │ - userAgent     │
                                              │ - timestamp     │
                                              └─────────────────┘
```

### Role-Based Access Control (RBAC)

#### Role Hierarchy and Permissions

1. **Owner** - Full system access within organization
   - All Admin permissions
   - Create organizations
   - Invite users and assign roles
   - Promote users to admin
   - Access audit logs

2. **Admin** - Management access within organization
   - All Viewer permissions  
   - Create, update, delete tasks
   - View all organization users
   - Access audit logs

3. **Viewer** - Basic access within organization
   - Read tasks within organization
   - Update task status (move between columns)
   - View own user profile

### JWT Authentication Integration

#### Authentication Flow

1. **Login Process:**
   ```typescript
   POST /api/auth/login
   {
     "email": "user@example.com",
     "password": "password"
   }
   ```

2. **Token Generation:**
   - JWT payload includes only user ID and email (`sub` and `email`)
   - Token signed with secret from environment configuration
   - Response includes user details, memberships array, and aggregated permissions

3. **Token Validation:**
   - Every protected endpoint validates JWT token
   - JWT Strategy extracts user ID from token and loads full user details
   - Organization context determined from request headers (`x-org-id`), query params, or body
   - JWT Strategy calls RBAC Service to resolve permissions based on user's role in the specific organization

#### Permission Resolution Process

```typescript
// JWT Strategy validation pipeline
async validate(req: Request, payload: any) {
  // 1. Load user from database using token payload
  const user = await this.users.findOne({ where: { id: payload.sub } });
  
  // 2. Extract organization context from request
  const requestedOrgId = this.extractOrgId(req); // Headers, query, or body
  
  // 3. Load user's active memberships
  const activeMemberships = await this.memberships.find({
    where: { userId: user.id, isActive: true, invitedPending: false }
  });
  
  // 4. Validate organization membership and resolve permissions
  const membership = activeMemberships.find(m => m.organizationId === requestedOrgId);
  const { roleName, permissions } = await this.rbac.getRoleWithInheritance(membership.roleId);
  
  // 5. Return enriched user context
  return {
    id: user.id,
    email: user.email,
    organizationId: membership.organizationId,
    roleName,
    permissions,
    isOwner: roleName.toLowerCase() === 'owner'
  };
}
```

#### Guard Implementation

**Global Guard Chain:**
1. `JwtAuthGuard` - Validates JWT token presence and validity, honors `@Public()` decorator
2. `PermissionsGuard` - Validates specific permissions from `@RequirePermissions()` decorator

**Decorator Usage Examples:**
```typescript
// Public endpoint (bypass authentication)
@Public()
@Get('health')
getHealth() { ... }

// Permission-based access (primary method)
@RequirePermissions('tasks:create')
@Post('tasks')
createTask() { ... }

// Multiple permissions required (all must be present)
@RequirePermissions('users:invite', 'organizations:manage')
@Post('users/invite')
inviteUser() { ... }
```

#### Organization Scoping Implementation

All data access requires organization context, resolved through multiple methods:

```typescript
// Organization context resolution priority:
// 1. Request headers: 'x-org-id' or 'x-organization-id'
// 2. Query parameters: 'organizationId' or 'orgId'  
// 3. Request body: 'organizationId' or 'orgId'
// 4. Single membership fallback (if user only belongs to one org)

@Injectable()
export class TasksService {
  private async resolveOrgId(user: any): Promise<string> {
    let orgId = user?.organizationId; // From JWT validation
    if (!orgId) {
      // Fallback: if user has single membership, use that
      const memberships = await this.memberships.find({ 
        where: { userId: user.id, isActive: true, invitedPending: false } 
      });
      if (memberships.length === 1) {
        orgId = memberships[0].organizationId;
      } else {
        throw new BadRequestException('Organization context is required');
      }
    }
    
    // Verify user is member of the organization
    const member = await this.memberships.findOne({ 
      where: { userId: user.id, organizationId: orgId, isActive: true } 
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    return orgId;
  }

  async findByOrganization(user: any): Promise<TaskEntity[]> {
    const organizationId = await this.resolveOrgId(user);
    return this.taskRepository.find({
      where: { organizationId, isArchived: false }
    });
  }
}
```

## API Documentation

All endpoints require JWT authentication via `Authorization: Bearer <token>` header unless marked as public.

### Health Check

#### GET `/api` (Public)
Basic health check endpoint.

**Response (200):**
```json
{
  "message": "Hello API"
}
```

### Authentication Endpoints

#### POST `/api/auth/login` (Public)
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "owner@123.com",
  "password": "password"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid-string",
    "email": "owner@123.com",
    "firstName": "System",
    "lastName": "Owner",
    "defaultOrganizationId": "org-uuid",
    "memberships": [
      {
        "membershipId": "membership-uuid",
        "organizationId": "org-uuid",
        "organizationName": "TurboVets HQ",
        "roleId": "role-uuid",
        "roleName": "Owner"
      }
    ],
    "permissions": ["tasks:create", "tasks:read", "tasks:update", "tasks:delete", "tasks:move", "users:invite", "organizations:create", "audit-logs:read"]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401):**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

### Task Management Endpoints

#### GET `/api/tasks`
List tasks accessible to authenticated user (organization-scoped). Requires `tasks:read` permission.

**No query parameters** - tasks are automatically filtered by organization membership and role.

**Response (200):**
```json
[
  {
    "id": "task-uuid",
    "title": "Implement authentication",
    "description": "Add JWT-based auth to the API",
    "status": "in-progress",
    "priority": "high",
    "category": "Development",
    "tags": ["backend", "security"],
    "dueDate": "2025-10-20T00:00:00.000Z",
    "completedAt": null,
    "assigneeId": "user-uuid",
    "assignee": {
      "id": "user-uuid",
      "firstName": "John",
      "lastName": "Doe"
    },
    "createdById": "creator-uuid",
    "createdBy": {
      "id": "creator-uuid",
      "firstName": "System",
      "lastName": "Owner"
    },
    "organizationId": "org-uuid",
    "organization": {
      "id": "org-uuid",
      "name": "TurboVets HQ"
    },
    "order": 0,
    "isArchived": false,
    "createdAt": "2025-10-15T10:00:00.000Z",
    "updatedAt": "2025-10-15T10:00:00.000Z"
  }
]
```

#### POST `/api/tasks`
Create a new task. Requires `tasks:create` permission.

**Request:**
```json
{
  "title": "Design user interface",
  "description": "Create wireframes for the dashboard",
  "status": "todo",
  "priority": "medium",
  "category": "Design",
  "tags": ["ui", "wireframes"],
  "dueDate": "2025-10-25T00:00:00.000Z",
  "assigneeId": "user-uuid"
}
```

**Valid Status Values:** `todo`, `in-progress`, `review`, `done`
**Valid Priority Values:** `low`, `medium`, `high`, `urgent`
```

**Response (201):**
```json
**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Create wireframes for the dashboard", 
  "description": "Create wireframes for the dashboard",
  "status": "todo",
  "priority": "medium",
  "category": "Design",
  "tags": ["ui", "wireframes"],
  "dueDate": "2025-10-25T00:00:00.000Z",
  "assignee": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "firstName": "John",
    "lastName": "Doe"
  },
  "createdBy": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "firstName": "System",
    "lastName": "Owner"
  },
  "order": 0,
  "isArchived": false,
  "createdAt": "2025-10-15T11:00:00.000Z",
  "updatedAt": "2025-10-15T11:00:00.000Z"
}
```

#### PUT `/api/tasks/:id`
Update an existing task. Only creator or admin can update.

**Request:**
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "priority": "high",
  "dueDate": "2025-10-30T00:00:00.000Z"
}
```

**Response (200):** Updated task object (same format as POST response)

**Error Response (403):**
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions to update this task"
}
```

#### PATCH `/api/tasks/:id/status`
Update task status and order. Supports drag-and-drop operations.

**Request:**
```json
{
  "status": "in-progress",
  "order": 3
}
```

**Response (200):** Updated task object

#### DELETE `/api/tasks/:id`
Delete a task. Only creator or admin can delete.

**Response (204):** No content

**Error Response (403):**
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions to delete this task"
}
```

### Organization Management Endpoints

#### POST `/api/organizations`
Create an organization. Owner only.

**Request:**
```json
{
  "name": "TurboVets West Coast"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "name": "TurboVets West Coast",
  "isActive": true,
  "createdAt": "2025-10-15T12:00:00.000Z",
  "updatedAt": "2025-10-15T12:00:00.000Z"
}
```

#### GET `/api/organizations`
List organizations for the current user.

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "TurboVets HQ",
    "isActive": true,
    "createdAt": "2025-10-15T12:00:00.000Z",
    "updatedAt": "2025-10-15T12:00:00.000Z"
  }
]
```

#### GET `/api/organizations/invitations`
List pending invitations for the current user.

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440007",
    "status": "pending",
    "organization": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "TurboVets West Coast"
    },
    "invitedBy": {
      "id": "550e8400-e29b-41d4-a716-446655440001", 
      "firstName": "John",
      "lastName": "Doe"
    },
    "createdAt": "2025-10-15T12:00:00.000Z"
  }
]
```

#### POST `/api/organizations/invitations/:membershipId/accept`
Accept an organization invitation.

**Response (200):**
```json
{
  "message": "Invitation accepted successfully"
}
```

#### POST `/api/organizations/invitations/:membershipId/decline`
Decline an organization invitation.

**Response (200):**
```json
{
  "message": "Invitation declined successfully"
}
```

### User Management Endpoints

#### GET `/api/users`
List all users in the current user's organizations.

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "role": { "name": "Admin" },
    "organization": { "name": "TurboVets HQ" }
  }
]
```

#### POST `/api/users/invite`
Invite a new user to the organization. Requires `users:invite` permission.

**Request:**
```json
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith", 
  "role": "admin",
  "organizationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "isActive": true,
    "role": { "name": "Admin" },
    "organization": { "name": "TurboVets HQ" }
  }
}
```

#### POST `/api/users/:id/assign-admin`
Promote a user to admin role. Requires `users:assign-admin` permission.

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "email": "user@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": { "name": "Admin" },
  "updatedAt": "2025-10-15T13:00:00.000Z"
}
```

### Audit Log Endpoints

#### GET `/api/audit-log`
View audit logs. Requires `audit-logs:read` permission.

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "action": "CREATE_TASK",
    "resource": "Task",
    "resourceId": "550e8400-e29b-41d4-a716-446655440000",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "firstName": "John",
      "lastName": "Doe"
    },
    "details": {
      "title": "New task created",
      "status": "todo"
    },
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2025-10-15T10:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440006",
    "action": "UPDATE_TASK_STATUS",
    "resource": "Task",
    "resourceId": "550e8400-e29b-41d4-a716-446655440000",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "firstName": "Jane",
      "lastName": "Smith"
    },
    "details": {
      "oldStatus": "todo",
      "newStatus": "in-progress"
    },
    "timestamp": "2025-10-15T11:30:00.000Z"
  }
]
```

## Future Considerations

Didn't use NgRx for state management, just stuck with services. I would use NgRx when I feel like the project needs it. 

Based on real world use case scenarios, maybe implement more features that would be suitable for them (i.e task to project mapping)



