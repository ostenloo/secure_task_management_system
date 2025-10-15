import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './constants';
import { OrgContextService } from './org-context.service';
import { filter, switchMap, take } from 'rxjs';

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string | null;
  organizationId: string;
  isActive: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly orgCtx = inject(OrgContextService);
  private cache: { orgId: string; users: UserListItem[] } | null = null;

  listUsers() {
    // Clear cache on org switch
    const cur = this.orgCtx.current;
    if (!cur?.id) {
      this.cache = null;
    } else if (this.cache && this.cache.orgId !== cur.id) {
      this.cache = null;
    }
    if (cur?.id) {
      return this.http.get<UserListItem[]>(`${API_BASE_URL}/users?organizationId=${encodeURIComponent(cur.id)}`);
    }
    return this.orgCtx.organization$.pipe(
      filter((o): o is NonNullable<typeof o> => !!o && !!o.id),
      take(1),
      switchMap((o) => this.http.get<UserListItem[]>(`${API_BASE_URL}/users?organizationId=${encodeURIComponent(o.id)}`))
    );
  }
}
