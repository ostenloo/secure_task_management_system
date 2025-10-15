import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './constants';

export interface CreateOrganizationPayload {
  name: string;
  description?: string;
  parentId?: string;
}

export interface InviteUserPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'viewer';
  organizationId?: string;
}

export interface InviteUserResponse {
  id: string;
  email: string;
  temporaryPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);

  createOrganization(payload: CreateOrganizationPayload) {
    return this.http.post(`${API_BASE_URL}/organizations`, payload);
  }

  inviteUser(payload: InviteUserPayload) {
    return this.http.post<InviteUserResponse>(`${API_BASE_URL}/users/invite`, payload);
  }

  assignAdmin(userId: string) {
    return this.http.post<{ success: boolean }>(`${API_BASE_URL}/users/${userId}/assign-admin`, {});
  }

  assignViewer(userId: string) {
    return this.http.post<{ success: boolean }>(`${API_BASE_URL}/users/${userId}/assign-viewer`, {});
  }
}
