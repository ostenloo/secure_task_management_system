import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskStatus } from '@org/data';
import { DueFilter, TaskFilter } from '../../core/task.service';

@Component({
  selector: 'app-task-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card p-6 space-y-6 sticky top-6">
      <header class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">Filters</h2>
          <p class="text-xs text-slate-500">Filter tasks by status and due date.</p>
        </div>
        <button class="text-xs text-primary-600 hover:text-primary-700" (click)="onReset()">Reset</button>
      </header>

      <div class="space-y-3">
        <span class="label">Status</span>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="rounded-lg border px-3 py-2 text-xs font-medium transition"
            [class.bg-primary-50]="working.status === 'all'"
            [class.border-primary-300]="working.status === 'all'"
            [class.text-primary-700]="working.status === 'all'"
            [class.border-slate-200]="working.status !== 'all'"
            [class.text-slate-600]="working.status !== 'all'"
            (click)="setStatus('all')"
          >
            All
          </button>
          <button
            *ngFor="let status of statuses"
            type="button"
            class="rounded-lg border px-3 py-2 text-xs font-medium transition"
            [class.bg-primary-50]="working.status === status"
            [class.border-primary-300]="working.status === status"
            [class.text-primary-700]="working.status === status"
            [class.border-slate-200]="working.status !== status"
            [class.text-slate-600]="working.status !== status"
            (click)="setStatus(status)"
          >
            {{ statusLabel(status) }}
          </button>
        </div>
      </div>

      <div class="space-y-3">
        <span class="label">Due</span>
        <select
          class="input"
          [(ngModel)]="working.due"
          (ngModelChange)="emitChange()"
        >
          <option *ngFor="let option of dueOptions" [value]="option.value">{{ option.label }}</option>
        </select>
      </div>

      <p class="text-xs text-slate-500">Drag tasks between columns to change status; filter here to focus your workload.</p>
    </div>
  `,
})
export class TaskFiltersComponent implements OnChanges {
  @Input({ required: true }) filter!: TaskFilter;
  @Input({ required: true }) statuses: TaskStatus[] = [];

  @Output() filterChange = new EventEmitter<TaskFilter>();
  @Output() reset = new EventEmitter<void>();

  working: TaskFilter = {
    status: 'all',
    due: 'all',
  };

  readonly dueOptions: Array<{ value: DueFilter; label: string }> = [
    { value: 'all', label: 'Any due date' },
    { value: 'today', label: 'Due today' },
    { value: 'thisWeek', label: 'Due this week' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'noDueDate', label: 'No due date' },
  ];

  ngOnChanges(_changes: SimpleChanges): void {
    this.working = { ...this.filter };
  }

  setStatus(status: TaskFilter['status']): void {
    this.working = { ...this.working, status };
    this.emitChange();
  }

  emitChange(): void {
    this.filterChange.emit({ ...this.working });
  }

  onReset(): void {
    this.reset.emit();
  }

  statusLabel(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.TODO:
        return 'To Do';
      case TaskStatus.IN_PROGRESS:
        return 'In Progress';
      case TaskStatus.REVIEW:
        return 'Review';
      case TaskStatus.DONE:
        return 'Done';
      default:
        return status;
    }
  }
}
