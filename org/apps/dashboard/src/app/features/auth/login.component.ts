import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-surface-100 px-4">
      <div class="w-full max-w-md card px-8 py-10 shadow-lg shadow-slate-200/60">
        <div class="flex flex-col items-center gap-3 mb-8 text-center">
          <h1 class="text-3xl font-semibold text-slate-900">Secure Task Management System</h1>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-6">
          <div class="flex flex-col gap-2">
            <label for="email" class="text-sm font-semibold text-slate-700">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="input"
              placeholder="you@company.com"
              autocomplete="email"
              autocapitalize="none"
              spellcheck="false"
              inputmode="email"
            />
            <span class="text-xs text-rose-500" *ngIf="emailInvalid()">
              Please enter a valid email address.
            </span>
          </div>

          <div class="flex flex-col gap-2">
            <label for="password" class="text-sm font-semibold text-slate-700 flex items-center justify-between">
              <span>Password</span>
              <button
                type="button"
                class="text-xs text-primary-600 hover:text-primary-700"
                (click)="togglePassword()"
                [attr.aria-pressed]="showPassword()"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              >
                {{ showPassword() ? 'Hide' : 'Show' }}
              </button>
            </label>
            <div class="relative">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                class="input pr-10"
                placeholder="••••••••"
                autocomplete="current-password"
              />
            </div>
            <span class="text-xs text-rose-500" *ngIf="passwordInvalid()">
              Password is required.
            </span>
          </div>

          <div
            class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex gap-3"
            *ngIf="error()"
          >
            <span class="font-medium">Authentication failed:</span>
            <span>{{ error() }}</span>
          </div>

          <button
            type="submit"
            class="btn-primary w-full py-2.5"
            [disabled]="loading()"
          >
            <span *ngIf="!loading()">Sign In</span>
            <span *ngIf="loading()" class="flex items-center justify-center gap-2">
              <span class="h-4 w-4 border-2 border-white/60 border-t-white rounded-full animate-spin"></span>
              Signing in…
            </span>
          </button>

          <p class="text-xs text-slate-500 text-center">
            Use <strong class="text-slate-700">owner@123.com</strong> / <strong class="text-slate-700">password</strong> for the seeded owner account
          </p>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {
    this.form = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set('');
    this.loading.set(true);

    const raw = this.form.getRawValue();
    const payload = {
      email: (raw.email ?? '').trim(),
      password: raw.password,
    } as { email: string; password: string };

    this.auth
      .login(payload)
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => this.router.navigateByUrl('/tasks'),
        error: (err) => {
          const message =
            err?.error?.message ||
            err?.error?.error ||
            'Unable to sign in. Please check your credentials.';
          this.error.set(message);
        },
      });
  }

  emailInvalid(): boolean {
    const ctrl = this.form.get('email');
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  passwordInvalid(): boolean {
    const ctrl = this.form.get('password');
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }
}
