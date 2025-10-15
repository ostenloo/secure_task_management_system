export interface PermissionDefinition {
  name: string;
  resource: string;
  action: string;
}

export const SYSTEM_PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { name: 'tasks:create', resource: 'tasks', action: 'create' },
  { name: 'tasks:read', resource: 'tasks', action: 'read' },
  { name: 'tasks:update', resource: 'tasks', action: 'update' },
  { name: 'tasks:delete', resource: 'tasks', action: 'delete' },
  { name: 'tasks:move', resource: 'tasks', action: 'move' },
  { name: 'audit-logs:read', resource: 'audit-logs', action: 'read' },
  { name: 'organizations:create', resource: 'organizations', action: 'create' },
  { name: 'users:invite', resource: 'users', action: 'invite' },
  { name: 'users:assign-admin', resource: 'users', action: 'assign-admin' },
  { name: 'users:read', resource: 'users', action: 'read' },
  { name: 'users:assign-viewer', resource: 'users', action: 'assign-viewer' },
];

export const SYSTEM_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'tasks:move',
    'audit-logs:read',
    'organizations:create',
    'users:invite',
    'users:assign-admin',
    'users:assign-viewer',
    'users:read',
  ],
  admin: [
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'tasks:move',
    'audit-logs:read',
    'users:read',
  ],
  viewer: [
    'tasks:read',
    // Allow update so viewers can edit limited fields of tasks assigned to them.
    // Service layer enforces field-level + assignee checks; viewers still cannot assign or delete.
    'tasks:update',
    'tasks:move',
  ],
};
