import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './constants';

export interface OrganizationItem {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
  role?: string | null;
}

export interface SimpleInvitePayload {
  email: string;
  role: 'admin' | 'viewer';
  organizationId?: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationsServiceClient {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<OrganizationItem[]>(`${API_BASE_URL}/organizations`);
  }

  listInvitations() {
    return this.http.get<Array<{ organizationId: string; organizationName: string; role: string | null; membershipId: string }>>(
      `${API_BASE_URL}/organizations/invitations`
    );
  }

  acceptInvitation(membershipId: string) {
    return this.http.post<{ success: boolean }>(`${API_BASE_URL}/organizations/invitations/${membershipId}/accept`, {});
  }

  declineInvitation(membershipId: string) {
    return this.http.post<{ success: boolean }>(`${API_BASE_URL}/organizations/invitations/${membershipId}/decline`, {});
  }

  inviteSimple(payload: SimpleInvitePayload) {
    return this.http.post(`${API_BASE_URL}/users/invite`, payload);
  }

  createOrganization(payload: { name: string; description?: string; parentId?: string }) {
    return this.http.post(`${API_BASE_URL}/organizations`, payload);
  }
}
