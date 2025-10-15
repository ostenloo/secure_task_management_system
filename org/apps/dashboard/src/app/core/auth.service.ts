import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { API_BASE_URL, SESSION_STORAGE_KEY } from './constants';

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  roleName?: string;
  organizationId?: string;
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

interface StoredSession {
  token: string;
  user: AuthUser;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session$ = new BehaviorSubject<StoredSession | null>(null);

  readonly user$: Observable<AuthUser | null> = this.session$.pipe(
    map((session) => session?.user ?? null)
  );

  constructor() {
    this.restore();
  }

  get token(): string | null {
    return this.session$.value?.token ?? null;
  }

  get isAuthenticated(): boolean {
    return !!this.session$.value?.token;
  }

  get currentUser(): AuthUser | null {
    return this.session$.value?.user ?? null;
  }

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login`, payload)
      .pipe(
        tap((response) => {
          this.persist(response);
        })
      );
  }

  logout(): void {
    this.session$.next(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    void this.router.navigate(['/login']);
  }

  private persist(response: LoginResponse): void {
    const session: StoredSession = {
      token: response.token,
      user: response.user,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.session$.next(session);
  }

  private restore(): void {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as StoredSession;
      if (parsed?.token) {
        this.session$.next(parsed);
      }
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }
}
