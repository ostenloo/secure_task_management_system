import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TaskModel } from '../core/task.service';
import { TaskPriority, TaskStatus } from '@org/data';

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  [TaskPriority.MEDIUM]: 'bg-sky-50 text-sky-700 border border-sky-200',
  [TaskPriority.HIGH]: 'bg-amber-50 text-amber-700 border border-amber-200',
  [TaskPriority.URGENT]: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'To Do',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.REVIEW]: 'Review',
  [TaskStatus.DONE]: 'Done',
};

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, NgClass, DatePipe],
  template: `
    <article class="card p-4 flex flex-col gap-4">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="text-sm font-semibold text-slate-900">{{ task.title }}</h3>
          <p class="text-xs text-slate-500" *ngIf="task.category">{{ task.category }}</p>
        </div>
        <span class="text-[11px] uppercase tracking-wide px-2 py-1 rounded-md border border-slate-200 bg-slate-100 text-slate-600">
          {{ STATUS_LABEL[task.status] }}
        </span>
      </div>

      <p class="text-sm text-slate-600 leading-relaxed" *ngIf="task.description">
        {{ task.description }}
      </p>

      <div class="flex flex-wrap gap-2 text-xs">
        <span class="px-2 py-1 rounded-full" [ngClass]="PRIORITY_BADGE[task.priority]">
          {{ task.priority | titlecase }} Priority
        </span>
        <span
          class="px-2 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700"
          *ngIf="task.dueDate"
        >
          Due {{ task.dueDate | date: 'mediumDate' }}
        </span>
        <span
          class="px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700"
          *ngIf="task.completedAt"
        >
          Completed {{ task.completedAt | date: 'mediumDate' }}
        </span>
      </div>

      <div class="flex flex-wrap gap-2" *ngIf="task.tags?.length">
        <span
          *ngFor="let tag of task.tags"
          class="text-[11px] bg-slate-100 border border-slate-200 rounded-full px-2 py-1 text-slate-600"
        >
          #{{ tag }}
        </span>
      </div>

      <div class="flex items-center justify-between pt-3 border-t border-slate-200">
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <span class="h-2 w-2 rounded-full" [ngClass]="priorityDot(task.priority)"></span>
          <span>Updated {{ task.updatedAt ?? task.createdAt | date: 'short' }}</span>
        </div>
        <div class="flex gap-2">
          <button
            *ngIf="canEdit"
            type="button"
            class="text-xs text-primary-600 hover:text-primary-700"
            (click)="edit.emit(task)"
          >
            Edit
          </button>
          <button
            *ngIf="canDelete"
            type="button"
            class="text-xs text-rose-500 hover:text-rose-600"
            (click)="remove.emit(task)"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  `,
})
export class TaskCardComponent {
  readonly PRIORITY_BADGE = PRIORITY_BADGE;
  readonly STATUS_LABEL = STATUS_LABEL;

  @Input({ required: true }) task!: TaskModel;
  @Input() canEdit = true;
  @Input() canDelete = false;
  @Output() edit = new EventEmitter<TaskModel>();
  @Output() remove = new EventEmitter<TaskModel>();

  priorityDot(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'bg-rose-500';
      case TaskPriority.HIGH:
        return 'bg-amber-500';
      case TaskPriority.MEDIUM:
        return 'bg-sky-500';
      default:
        return 'bg-emerald-500';
    }
  }
}
