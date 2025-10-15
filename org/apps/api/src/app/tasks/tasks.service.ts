import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from '../entities/task.entity';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { CreateTaskDto, TaskPriorityDto, TaskStatusDto, UpdateTaskDto } from './dtos';
import { UserEntity } from '../entities/user.entity';
import { UserOrganizationEntity } from '../entities/user-organization.entity';
import { OrganizationEntity } from '../entities/organization.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity) private tasks: Repository<TaskEntity>,
    @InjectRepository(AuditLogEntity) private audit: Repository<AuditLogEntity>,
  @InjectRepository(UserEntity) private users: Repository<UserEntity>,
  @InjectRepository(UserOrganizationEntity) private memberships: Repository<UserOrganizationEntity>,
    @InjectRepository(OrganizationEntity) private orgs: Repository<OrganizationEntity>,
  ) {}

  private async log(user: any, organizationId: string, action: string, resourceId: string, details?: any) {
    await this.audit.save({
      userId: user.id,
      organizationId,
      action,
      resource: 'tasks',
      resourceId,
      details,
    });
  }

  private async getOrgRoleName(userId: string, organizationId: string): Promise<string | null> {
    if (!userId || !organizationId) return null;
    const member = await this.memberships.findOne({
      where: { userId, organizationId, isActive: true, invitedPending: false },
      relations: ['role'],
    });
    return member?.role?.name?.toLowerCase?.() ?? null;
  }

  async create(user: any, dto: CreateTaskDto, targetOrgId?: string) {
  const organizationId = await this.resolveOrgId(user, targetOrgId);
    const roleName = (await this.getOrgRoleName(user.id, organizationId)) || '';
    const isOwnerOrAdmin = roleName === 'owner' || roleName === 'admin';
    if (!isOwnerOrAdmin) {
      throw new ForbiddenException('Not permitted to create tasks in this organization');
    }
    const trimmedTitle = (dto.title ?? '').trim();
    if (!trimmedTitle) {
      throw new BadRequestException('Title is required');
    }
    // Basic org scoping: force org/createdBy
    const entity = this.tasks.create({
      title: trimmedTitle,
      description: (dto.description ?? '').trim() || null,
      status: (dto.status ?? TaskStatusDto.TODO) as string,
      priority: dto.priority as string,
      category: (dto.category ?? '').trim() || null,
      assigneeId: dto.assigneeId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      tags: dto.tags,
      organizationId,
      createdById: user.id,
    });
    const saved = await this.tasks.save(entity);
    await this.log(user, organizationId, 'CREATE_TASK', saved.id, { title: saved.title });
    return saved;
  }

  async list(user: any, targetOrgId?: string) {
  const organizationId = await this.resolveOrgId(user, targetOrgId);
  const role = (await this.getOrgRoleName(user.id, organizationId)) || '';
    // Scope by organization; restrict viewer visibility to only assigned tasks
    if (role === 'viewer') {
      return this.tasks.find({ where: { organizationId, assigneeId: user.id } });
    }
    return this.tasks.find({ where: { organizationId } });
  }

  async update(user: any, id: string, dto: UpdateTaskDto, targetOrgId?: string) {
  const organizationId = await this.resolveOrgId(user, targetOrgId);
    const existing = await this.tasks.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');
    if (existing.organizationId !== organizationId) throw new ForbiddenException('Cross-org access denied');
  const role = (await this.getOrgRoleName(user.id, organizationId)) || '';
    const isOwnerRole = role === 'owner';
    const isAdminRole = role === 'admin';
    const isViewerRole = role === 'viewer';
    const isCreator = existing.createdById === user.id;

    // Owner/Admin: full update allowed
    if (isOwnerRole || isAdminRole) {
      // pass
    } else if (isViewerRole) {
      // Viewer: can only edit tasks if assigned to them, and limited fields
      if (existing.assigneeId !== user.id) {
        throw new ForbiddenException('Viewers can only edit tasks assigned to them');
      }
      const allowed: (keyof UpdateTaskDto)[] = [
        'title',
        'description',
        'status',
        'priority',
        'category',
        'dueDate',
        'tags',
        'completedAt',
      ];
      const keys = Object.keys(dto) as (keyof UpdateTaskDto)[];
      const disallowed = keys.filter((k) => !allowed.includes(k));
      if (disallowed.length) {
        throw new ForbiddenException(`Viewers cannot update fields: ${disallowed.join(', ')}`);
      }
    } else if (!isCreator) {
      // Fallback: only creators can update if no recognized role
      throw new ForbiddenException('Not permitted');
    }
    // Map allowed fields from DTO, converting date strings
    if (dto.title !== undefined) {
      const t = (dto.title ?? '').trim();
      if (!t) throw new BadRequestException('Title is required');
      existing.title = t;
    }
    if (dto.description !== undefined) existing.description = (dto.description ?? '').trim();
    if (dto.status !== undefined) existing.status = dto.status as string;
    if (dto.priority !== undefined) existing.priority = dto.priority as string;
    if (dto.category !== undefined) existing.category = (dto.category ?? '').trim();
    if (dto.assigneeId !== undefined) {
      if (!(isOwnerRole || isAdminRole)) {
        throw new ForbiddenException('Only admins/owners can assign tasks');
      }
      existing.assigneeId = dto.assigneeId;
    }
    if (dto.dueDate !== undefined) existing.dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;
    if (dto.completedAt !== undefined) existing.completedAt = dto.completedAt ? new Date(dto.completedAt) : undefined;
    if (dto.order !== undefined) existing.order = dto.order;
    if (dto.tags !== undefined) existing.tags = dto.tags;
    // Validate assignee constraints when setting/changing assignee
    if (dto.assigneeId !== undefined) {
      const assignee = await this.users.findOne({ where: { id: dto.assigneeId } });
      if (!assignee) {
        throw new NotFoundException('Assignee not found');
      }
      const assigneeMembership = await this.memberships.findOne({ where: { userId: assignee.id, organizationId, isActive: true, invitedPending: false } });
      if (!assigneeMembership) {
        throw new ForbiddenException('Cannot assign tasks to a user who is not part of this organization');
      }
      const assigneeRole = (assigneeMembership.role?.name || assigneeMembership.roleId || '').toString().toLowerCase();
      // If role is loaded, prefer name; else allow any member; the main policy is org membership.
    }

    const saved = await this.tasks.save(existing);
    await this.log(user, organizationId, 'UPDATE_TASK', saved.id, { fields: Object.keys(dto as any) });
    return saved;
  }

  async remove(user: any, id: string, targetOrgId?: string) {
  const organizationId = await this.resolveOrgId(user, targetOrgId);
    const existing = await this.tasks.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');
    if (existing.organizationId !== organizationId) throw new ForbiddenException('Cross-org access denied');
  const role = (await this.getOrgRoleName(user.id, organizationId)) || '';
    const isOwner = existing.createdById === user.id;
    const isAdmin = role === 'admin' || role === 'owner';
    if (!isOwner && !isAdmin) throw new ForbiddenException('Not permitted');
    await this.tasks.remove(existing);
    await this.log(user, organizationId, 'DELETE_TASK', id);
    return { success: true };
  }

  async moveStatus(user: any, id: string, status: TaskStatusDto, order?: number, targetOrgId?: string) {
    const organizationId = await this.resolveOrgId(user, targetOrgId);
    const existing = await this.tasks.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');
    if (existing.organizationId !== organizationId) throw new ForbiddenException('Cross-org access denied');
    // Viewers can only move tasks assigned to them
    const role = (await this.getOrgRoleName(user.id, organizationId)) || '';
    if (role === 'viewer' && existing.assigneeId !== user.id) {
      throw new ForbiddenException('Viewers can only update tasks assigned to them');
    }

    existing.status = status as string;
    if (status === TaskStatusDto.DONE && !existing.completedAt) {
      existing.completedAt = new Date();
    }
    if (status !== TaskStatusDto.DONE) {
      existing.completedAt = null;
    }
    if (order !== undefined) {
      existing.order = order;
    }

    const saved = await this.tasks.save(existing);
    await this.log(user, organizationId, 'MOVE_TASK_STATUS', saved.id, { status, order });
    return saved;
  }

  private async resolveOrgId(user: any, targetOrgId?: string): Promise<string> {
    // If orgId is not provided, try to infer from user's single active membership
    if (!targetOrgId) {
      const memberships = await this.memberships.find({ where: { userId: user.id, isActive: true, invitedPending: false } });
      const uniqueOrgIds = Array.from(new Set(memberships.map((m) => m.organizationId)));
      if (uniqueOrgIds.length === 1) {
        targetOrgId = uniqueOrgIds[0];
      } else {
        throw new BadRequestException('Organization context is required');
      }
    }
    // Ensure the user is an active, non-pending member of the target organization
    const member = await this.memberships.findOne({ where: { userId: user.id, organizationId: targetOrgId, isActive: true, invitedPending: false } });
    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    return targetOrgId;
  }
}
