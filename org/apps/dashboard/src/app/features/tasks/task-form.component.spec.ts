import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskFormComponent, TaskFormPayload } from './task-form.component';
import { TaskPriority, TaskStatus } from '@org/data';
import { TaskModel } from '../../core/task.service';
import { SimpleChange } from '@angular/core';

describe('TaskFormComponent', () => {
  let fixture: ComponentFixture<TaskFormComponent>;
  let component: TaskFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskFormComponent);
    component = fixture.componentInstance;
    component.priorities = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.URGENT];
    component.statuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE];
    fixture.detectChanges();
  });

  it('should emit normalized payload on submit', () => {
    let payload: TaskFormPayload | null = null;
    component.submit.subscribe((value) => (payload = value));

    component.form.setValue({
      title: '  Zero Trust Rollout ',
      description: ' Harden edge and VPN access. ',
      status: TaskStatus.REVIEW,
      priority: TaskPriority.HIGH,
      category: ' Security ',
      dueDate: '2025-01-15',
      tags: 'zero-trust, vpn , security',
      assigneeId: '',
    });

  component.submitForm();

  expect(payload).toBeTruthy();
  // Narrow type for TypeScript
  const p = (payload as unknown) as TaskFormPayload;
  expect(p.title).toBe('Zero Trust Rollout');
  expect(p.description).toBe('Harden edge and VPN access.');
  expect(p.category).toBe('Security');
  expect(p.dueDate as string).toContain('2025-01-15');
  expect(p.tags).toEqual(['zero-trust', 'vpn', 'security']);
  });

  it('should hydrate form when editing existing task', () => {
    const task: TaskModel = {
      id: '123',
      title: 'Complete audit',
      description: 'Gather Q4 logs',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      category: 'Compliance',
      dueDate: new Date('2024-12-31T00:00:00Z'),
      completedAt: null,
      assigneeId: undefined,
      order: 0,
      tags: ['audit', 'q4'],
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-02-01T00:00:00Z'),
    };

    component.initialTask = task;
    component.ngOnChanges({ initialTask: new SimpleChange(null, task, false) });
    fixture.detectChanges();

    expect(component.form.getRawValue().title).toBe('Complete audit');
    expect(component.form.getRawValue().status).toBe(TaskStatus.IN_PROGRESS);
    expect(component.form.getRawValue().tags).toContain('audit');
  });
});
