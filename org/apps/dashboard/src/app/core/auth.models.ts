export interface UserMembership {
  membershipId: string;
  organizationId: string;
  organizationName?: string;
  roleId: string;
  roleName?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  defaultOrganizationId?: string | null;
  memberships: UserMembership[];
  permissions?: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}
