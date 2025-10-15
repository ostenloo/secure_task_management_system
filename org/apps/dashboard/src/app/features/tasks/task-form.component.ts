import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { TaskPriority, TaskStatus } from '@org/data';
import { TaskModel } from '../../core/task.service';
import { UserListItem } from '../../core/users.service';

export interface TaskFormPayload {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string;
  dueDate?: string | null;
  tags: string[];
  assigneeId: string | null;
}

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form class="space-y-4" [formGroup]="form" (ngSubmit)="submitForm()">
      <div class="space-y-2">
        <label for="title" class="text-sm font-semibold text-slate-700">Title</label>
        <input
          id="title"
          formControlName="title"
          placeholder="Quarterly security posture review"
          class="input"
        />
        <p class="text-xs text-rose-500" *ngIf="invalid('title')">Title is required and must be under 255 characters.</p>
      </div>

      <div class="space-y-2">
        <label for="description" class="text-sm font-semibold text-slate-700">Description</label>
        <textarea
          id="description"
          formControlName="description"
          rows="4"
          placeholder="Add relevant details, acceptance criteria, or links."
          class="input min-h-[120px]"
        ></textarea>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700">Status</label>
          <select
            formControlName="status"
            class="input"
          >
            <option *ngFor="let status of statuses" [value]="status">{{ statusLabel(status) }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700">Priority</label>
          <select
            formControlName="priority"
            class="input"
          >
            <option *ngFor="let priority of priorities" [value]="priority">{{ priority | titlecase }}</option>
          </select>
        </div>
      </div>

      <div class="space-y-2" *ngIf="canAssign">
        <label class="text-sm font-semibold text-slate-700">Assignee</label>
        <select class="input" formControlName="assigneeId">
          <option value="">Unassigned</option>
          <option *ngFor="let u of users" [value]="u.id">
            {{ u.firstName }} {{ u.lastName }} — {{ u.email }}
          </option>
        </select>
        <p class="text-xs text-slate-500">Only owners/admins can assign tasks.</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700">Category</label>
          <input
            formControlName="category"
            placeholder="Security"
            class="input"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700">Due date</label>
          <input
            type="date"
            formControlName="dueDate"
            class="input"
          />
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold text-slate-700">Tags</label>
        <input
          formControlName="tags"
          placeholder="compliance,reporting"
          class="input"
        />
        <p class="text-xs text-slate-500">Separate tags with commas.</p>
      </div>

      <div class="flex items-center justify-end gap-3 pt-4">
        <button type="button" class="btn-outline" (click)="cancel.emit()">Cancel</button>
        <button type="submit" class="btn-primary">
          {{ mode === 'create' ? 'Create Task' : 'Save Changes' }}
        </button>
      </div>
    </form>
  `,
})
export class TaskFormComponent implements OnChanges {
  @Input({ required: true }) statuses: TaskStatus[] = [];
  @Input({ required: true }) priorities: TaskPriority[] = [];
  @Input() initialTask: TaskModel | null = null;
  @Input() defaultStatus: TaskStatus = TaskStatus.TODO;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() users: UserListItem[] = [];
  @Input() canAssign = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() submit = new EventEmitter<TaskFormPayload>();

  readonly statusesLabel = new Map<TaskStatus, string>([
    [TaskStatus.TODO, 'To Do'],
    [TaskStatus.IN_PROGRESS, 'In Progress'],
    [TaskStatus.REVIEW, 'Review'],
    [TaskStatus.DONE, 'Done'],
  ]);

  readonly form;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.nonNullable.group({
      title: ['', [Validators.required, this.trimmedRequiredValidator, Validators.maxLength(255)]],
      description: [''],
      status: [this.defaultStatus, Validators.required],
      priority: [TaskPriority.MEDIUM, Validators.required],
      category: [''],
      dueDate: [''],
      tags: [''],
      assigneeId: [''],
    });
  }

  // Ensure title isn't just whitespace
  private trimmedRequiredValidator(control: AbstractControl): ValidationErrors | null {
    const val = (control.value ?? '').toString();
    if (val.trim().length === 0) {
      return { required: true };
    }
    return null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['defaultStatus'] && !this.initialTask) {
      this.form.patchValue({ status: this.defaultStatus });
    }

    if (changes['initialTask']) {
      if (this.initialTask) {
        this.mode = 'edit';
        this.form.patchValue({
          title: this.initialTask.title,
          description: this.initialTask.description ?? '',
          status: this.initialTask.status,
          priority: this.initialTask.priority,
          category: this.initialTask.category ?? '',
          dueDate: this.initialTask.dueDate ? this.initialTask.dueDate.toISOString().substring(0, 10) : '',
          tags: this.initialTask.tags?.join(', ') ?? '',
          assigneeId: this.initialTask.assigneeId ?? '',
        });
      } else {
        this.mode = 'create';
        this.form.reset({
          title: '',
          description: '',
          status: this.defaultStatus,
          priority: TaskPriority.MEDIUM,
          category: '',
          dueDate: '',
          tags: '',
          assigneeId: '',
        });
      }
    }
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: TaskFormPayload = {
      title: value.title.trim(),
      description: value.description?.trim() || undefined,
      status: value.status,
      priority: value.priority,
      category: value.category?.trim() || undefined,
      dueDate: value.dueDate ? new Date(value.dueDate).toISOString() : null,
      tags: value.tags
        ? value.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      assigneeId: value.assigneeId ? value.assigneeId : null,
    };
    // If title ended up empty after trimming, surface error to the form and abort
    if (!payload.title) {
      this.form.get('title')?.setErrors({ required: true });
      this.form.get('title')?.markAsTouched();
      return;
    }
    this.submit.emit(payload);
  }

  invalid(control: string): boolean {
    const ctrl = this.form.get(control);
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  statusLabel(status: TaskStatus): string {
    return this.statusesLabel.get(status) ?? status;
  }
}
