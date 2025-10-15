import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  finalize,
  map,
  of,
  tap,
} from 'rxjs';
import { API_BASE_URL } from './constants';
import { OrgContextService } from './org-context.service';
import { TaskPriority, TaskStatus } from '@org/data';

export interface TaskModel {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string | null;
  assigneeId?: string | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  order: number;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type DueFilter = 'all' | 'overdue' | 'today' | 'thisWeek' | 'noDueDate';

export interface TaskFilter {
  status: TaskStatus | 'all';
  due: DueFilter;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority: TaskPriority;
  category?: string;
  assigneeId?: string;
  dueDate?: string | null;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  order?: number;
  tags?: string[];
}

interface TaskApiModel extends Omit<TaskModel, 'dueDate' | 'completedAt' | 'createdAt' | 'updatedAt'> {
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const STATUS_SEQUENCE: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.DONE,
];

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly orgCtx = inject(OrgContextService);
  private readonly tasksSubject = new BehaviorSubject<TaskModel[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly filterSubject = new BehaviorSubject<TaskFilter>({
    status: 'all',
    due: 'all',
  });

  // Clear tasks immediately when organization context changes to avoid flashing stale tasks
  private readonly _orgSub = this.orgCtx.organization$.subscribe((org) => {
    // Enter loading state and clear current tasks immediately to prevent cross-org flicker
    this.loadingSubject.next(true);
    this.tasksSubject.next([]);
    this.filterSubject.next({ status: 'all', due: 'all' });
    if (!org?.id) {
      this.loadingSubject.next(false);
      return;
    }
    // Kick off a fresh load for the new organization
    void this.load().subscribe({
      error: () => this.loadingSubject.next(false),
    });
  });

  readonly tasks$ = this.tasksSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly filter$ = this.filterSubject.asObservable();

  readonly filteredTasks$ = combineLatest([this.tasks$, this.filter$]).pipe(
    map(([tasks, filter]) => this.applyFilter(tasks, filter))
  );

  load(): Observable<TaskModel[]> {
    const orgId = this.orgCtx.current?.id;
    if (!orgId) {
      this.loadingSubject.next(false);
      const empty: TaskModel[] = [];
      this.tasksSubject.next(empty);
      return of(empty);
    }
    this.loadingSubject.next(true);
    const url = `${API_BASE_URL}/tasks`;
    return this.http.get<TaskApiModel[]>(url).pipe(
      map((items) =>
        items
          .map((item) => this.mapTask(item))
          .sort((a, b) => this.sortByStatus(a, b))
      ),
      tap((tasks) => this.tasksSubject.next(tasks)),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  refresh(): void {
    void this.load().subscribe({
      error: () => {
        // Errors handled by subscriber; keep method fire-and-forget.
      },
    });
  }

  create(payload: CreateTaskInput): Observable<TaskModel> {
    const body = {
      ...payload,
      status: payload.status ?? TaskStatus.TODO,
    };
    const url = `${API_BASE_URL}/tasks`;
    return this.http.post<TaskApiModel>(url, body).pipe(
      map((item) => this.mapTask(item)),
      tap((task) => {
        const next = [...this.tasksSubject.value, task].sort((a, b) =>
          this.sortByStatus(a, b)
        );
        this.tasksSubject.next(next);
      })
    );
  }

  update(id: string, changes: UpdateTaskInput): Observable<TaskModel> {
    const url = `${API_BASE_URL}/tasks/${id}`;
    return this.http
      .put<TaskApiModel>(url, changes)
      .pipe(
        map((item) => this.mapTask(item)),
        tap((updated) => {
          const next = this.tasksSubject.value
            .map((task) => (task.id === id ? updated : task))
            .sort((a, b) => this.sortByStatus(a, b));
          this.tasksSubject.next(next);
        })
      );
  }

  remove(id: string): Observable<void> {
    const url = `${API_BASE_URL}/tasks/${id}`;
    return this.http
      .delete<void>(url)
      .pipe(
        tap(() => {
          this.tasksSubject.next(
            this.tasksSubject.value.filter((task) => task.id !== id)
          );
        })
      );
  }

  moveTask(taskId: string, status: TaskStatus, index: number): Observable<TaskModel> {
    const rearranged = this.reorderLocal(taskId, status, index);
    const url = `${API_BASE_URL}/tasks/${taskId}/status`;
    const request$ = this.http
      .patch<TaskApiModel>(url, {
        status,
        order: index,
      })
      .pipe(map((item) => this.mapTask(item)));

    const updateLocal = (updated: TaskModel) => {
      const next = this.tasksSubject.value
        .map((task) => (task.id === taskId ? updated : task))
        .sort((a, b) => this.sortByStatus(a, b));
      this.tasksSubject.next(next);
    };

    if (!rearranged) {
      return request$.pipe(tap(updateLocal));
    }

    return request$.pipe(tap(updateLocal));
  }

  setFilter(update: Partial<TaskFilter>): void {
    this.filterSubject.next({
      ...this.filterSubject.value,
      ...update,
    });
  }

  resetFilters(): void {
    this.filterSubject.next({
      status: 'all',
      due: 'all',
    });
  }

  private applyFilter(tasks: TaskModel[], filter: TaskFilter): TaskModel[] {
    return tasks.filter((task) => {
      if (filter.status !== 'all' && task.status !== filter.status) {
        return false;
      }
      if (!this.matchesDueFilter(task, filter.due)) {
        return false;
      }
      return true;
    });
  }

  private matchesDueFilter(task: TaskModel, due: DueFilter): boolean {
    if (due === 'all') return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    if (due === 'noDueDate') {
      return !dueDate;
    }
    if (!dueDate) return false;
    dueDate.setHours(0, 0, 0, 0);

    if (due === 'today') {
      return dueDate.getTime() === today.getTime();
    }

    if (due === 'overdue') {
      return dueDate.getTime() < today.getTime();
    }

    if (due === 'thisWeek') {
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return dueDate >= today && dueDate <= endOfWeek;
    }

    return true;
  }

  private mapTask(item: TaskApiModel): TaskModel {
    return {
      ...item,
      dueDate: item.dueDate ? new Date(item.dueDate) : null,
      completedAt: item.completedAt ? new Date(item.completedAt) : null,
      createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
    };
  }

  private sortByStatus(a: TaskModel, b: TaskModel): number {
    const statusDiff =
      STATUS_SEQUENCE.indexOf(a.status) - STATUS_SEQUENCE.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;
    if (a.order !== b.order) return a.order - b.order;
    if (a.updatedAt && b.updatedAt) {
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
    return a.title.localeCompare(b.title);
  }

  private reorderLocal(taskId: string, status: TaskStatus, index: number): TaskModel | null {
    const existing = this.tasksSubject.value.map((task) => ({ ...task }));
    const moving = existing.find((task) => task.id === taskId);
    if (!moving) return null;

    const statuses = Array.from(
      new Set<TaskStatus | string>([...STATUS_SEQUENCE, status, ...existing.map((task) => task.status)])
    ) as TaskStatus[];

    const withoutMoving = existing.filter((task) => task.id !== taskId);
    moving.status = status;

    const next: TaskModel[] = [];
    for (const currentStatus of statuses) {
      const items = withoutMoving
        .filter((task) => task.status === currentStatus)
        .sort((a, b) => a.order - b.order);

      if (currentStatus === status) {
        const target = [...items];
        target.splice(index, 0, moving);
        target.forEach((task, idx) => (task.order = idx));
        next.push(...target);
      } else {
        items.forEach((task, idx) => {
          task.order = idx;
          next.push(task);
        });
      }
    }

    this.tasksSubject.next(next.sort((a, b) => this.sortByStatus(a, b)));
    return moving;
  }
}
