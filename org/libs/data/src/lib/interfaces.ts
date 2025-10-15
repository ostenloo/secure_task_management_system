// Organization interfaces (2-level hierarchy)
export interface Organization {
  id: string;
  name: string;
  description?: string;
  parentId?: string; // For 2-level hierarchy
  parent?: Organization;
  children?: Organization[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationDto {
  name: string;
  description?: string;
  parentId?: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// User Role enum for authorization
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager', 
  USER = 'user'
}

// Role and Permission interfaces
export interface Role {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  permissions: Permission[];
  inheritsFrom?: Role[];
  isSystemRole: boolean; // For Owner, Admin, Viewer
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  resource: string; // e.g., 'tasks', 'users', 'organizations'
  action: string; // e.g., 'create', 'read', 'update', 'delete'
  conditions?: Record<string, any>; // For conditional permissions
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  organizationId: string;
  permissionIds: string[];
  inheritsFromIds?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissionIds?: string[];
  inheritsFromIds?: string[];
}

// Enhanced User interfaces
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string; // Only for creation, not returned
  organizationId: string;
  organization?: Organization;
  roleId: string;
  role?: Role;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  organizationId: string;
  roleId: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  roleId?: string;
  isActive?: boolean;
}

// Enhanced Task interfaces
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string; // e.g., "Work", "Personal"
  assigneeId?: string;
  assignee?: User;
  createdById: string;
  createdBy?: User;
  organizationId: string;
  organization?: Organization;
  dueDate?: Date;
  completedAt?: Date;
  order?: number; // For drag-and-drop ordering
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority: TaskPriority;
  category?: string;
  assigneeId?: string;
  dueDate?: Date;
  tags?: string[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  assigneeId?: string;
  dueDate?: Date;
  completedAt?: Date;
  order?: number;
  tags?: string[];
}

// Audit Log interface
export interface AuditLog {
  id: string;
  userId: string;
  user?: User;
  organizationId: string;
  action: string; // e.g., 'CREATE_TASK', 'UPDATE_TASK', 'DELETE_TASK'
  resource: string; // e.g., 'tasks', 'users'
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// Enums
export enum SystemRole {
  OWNER = 'owner',
  ADMIN = 'admin', 
  VIEWER = 'viewer'
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  REVIEW = 'review',
  DONE = 'done'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // Full access
  MOVE = 'move',
  INVITE = 'invite',
  ASSIGN_ADMIN = 'assign-admin'
}

export enum PermissionResource {
  TASKS = 'tasks',
  USERS = 'users',
  ORGANIZATIONS = 'organizations',
  ROLES = 'roles',
  AUDIT_LOGS = 'audit-logs'
}

export interface InviteUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: SystemRole.ADMIN | SystemRole.VIEWER;
  organizationId?: string;
}

export interface AssignAdminDto {
  userId: string;
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  parentId?: string;
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface FilterOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  assigneeId?: string;
  dueDate?: string;
  tags?: string[];
}

// Authentication interfaces
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string; // For creating new organization
  organizationId?: string; // For joining existing organization
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  organizationId: string;
  roleId: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

// Task Statistics and Dashboard interfaces
export interface TaskStatistics {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  completedThisWeek: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
}

export interface DashboardData {
  user: Omit<User, 'password'>;
  taskStatistics: TaskStatistics;
  recentTasks: Task[];
  upcomingTasks: Task[];
  organization: Organization;
}
