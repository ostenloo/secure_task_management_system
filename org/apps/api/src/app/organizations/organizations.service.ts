import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrganizationEntity } from '../entities/organization.entity';
import { RoleEntity } from '../entities/role.entity';
import { PermissionEntity } from '../entities/permission.entity';
import { UserEntity } from '../entities/user.entity';
import { UserOrganizationEntity } from '../entities/user-organization.entity';
import { CreateOrganizationDto } from './dtos';
import { SYSTEM_PERMISSION_DEFINITIONS, SYSTEM_ROLE_PERMISSIONS } from '../shared/system-permissions';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(OrganizationEntity) private readonly organizations: Repository<OrganizationEntity>,
    @InjectRepository(RoleEntity) private readonly roles: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity) private readonly permissions: Repository<PermissionEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(UserOrganizationEntity) private readonly memberships: Repository<UserOrganizationEntity>,
  ) {}

  async createOrganization(user: any, dto: CreateOrganizationDto) {
    const entity = this.organizations.create({
      name: dto.name,
      description: dto.description,
      // Flat hierarchy: no parent-child relationships
      parentId: null,
      isActive: true,
    });
    const organization = await this.organizations.save(entity);
    await this.ensureSystemRoles(organization.id);
    // Auto-add the creator to the new organization as the owner membership
    const ownerRole = await this.roles.findOne({ where: { name: 'owner', organizationId: organization.id } });
    if (ownerRole) {
      const creator = await this.users.findOne({ where: { id: user.id } });
      if (creator) {
        const existing = await this.memberships.findOne({ where: { userId: creator.id, organizationId: organization.id } });
        if (!existing) {
          const membership = this.memberships.create({
            userId: creator.id,
            organizationId: organization.id,
            roleId: ownerRole.id,
            isActive: true,
            invitedPending: false,
          });
          await this.memberships.save(membership);
        }
      }
    }
    return organization;
  }

  async ensureSystemRoles(organizationId: string) {
    const permissions = await this.ensurePermissions();
    for (const [roleName, permissionNames] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
      let role = await this.roles.findOne({
        where: { name: roleName, organizationId },
      });
      if (!role) {
        role = this.roles.create({
          name: roleName,
          organizationId,
          isSystemRole: true,
        });
      }
      role.permissions = permissionNames
        .map((name) => permissions[name])
        .filter(Boolean);
      await this.roles.save(role);
    }
  }

  private async ensurePermissions(): Promise<Record<string, PermissionEntity>> {
    const existing = await this.permissions.find({
      where: { name: In(SYSTEM_PERMISSION_DEFINITIONS.map((p) => p.name)) },
    });
    const byName: Record<string, PermissionEntity> = {};
    for (const perm of existing) {
      byName[perm.name] = perm;
    }

    for (const def of SYSTEM_PERMISSION_DEFINITIONS) {
      if (!byName[def.name]) {
        const created = this.permissions.create({
          name: def.name,
          resource: def.resource,
          action: def.action,
        });
        byName[def.name] = await this.permissions.save(created);
      }
    }

    return byName;
  }

  async listOrganizations(user: any) {
    if (!user?.id) {
      throw new ForbiddenException('User context is required');
    }
    const memberships = await this.memberships.find({
      where: { userId: user.id, isActive: true, invitedPending: false },
      relations: ['organization', 'role'],
    });
    if (!memberships.length) return [];
    return memberships.map((m) => ({
      id: m.organizationId,
      name: m.organization?.name || 'Organization',
      description: m.organization?.description,
      parentId: m.organization?.parentId,
      isActive: m.organization?.isActive ?? true,
      createdAt: m.organization?.createdAt ?? new Date(),
      role: m.role?.name || null,
    }));
  }

  async listInvitations(currentUser: any) {
    const pending = await this.memberships.find({
      where: { userId: currentUser.id, invitedPending: true, isActive: false },
      relations: ['role', 'organization'],
    });
    if (!pending.length) return [];
    return pending.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization?.name || 'Organization',
      role: m.role?.name || null,
      membershipId: m.id,
    }));
  }

  async acceptInvitation(currentUser: any, membershipId: string) {
    const m = await this.memberships.findOne({ where: { id: membershipId } });
    if (!m) throw new NotFoundException('Invitation not found');
    if (m.userId !== currentUser.id) throw new ForbiddenException('Cannot accept invitations for another user');
    m.invitedPending = false;
    m.isActive = true;
    await this.memberships.save(m);
    return { success: true };
  }

  async declineInvitation(currentUser: any, membershipId: string) {
    const m = await this.memberships.findOne({ where: { id: membershipId } });
    if (!m) throw new NotFoundException('Invitation not found');
    if (m.userId !== currentUser.id) throw new ForbiddenException('Cannot decline invitations for another user');
    await this.memberships.remove(m);
    return { success: true };
  }
}
