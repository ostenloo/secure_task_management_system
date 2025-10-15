import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { RoleEntity } from '../entities/role.entity';
import { OrganizationEntity } from '../entities/organization.entity';
import { InviteUserDto } from './dtos';
import { OrganizationsService } from '../organizations/organizations.service';
import { UserOrganizationEntity } from '../entities/user-organization.entity';

@Injectable()
export class UsersService {
  constructor(
  @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
  @InjectRepository(UserOrganizationEntity) private readonly memberships: Repository<UserOrganizationEntity>,
    @InjectRepository(RoleEntity) private readonly roles: Repository<RoleEntity>,
    @InjectRepository(OrganizationEntity) private readonly organizations: Repository<OrganizationEntity>,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async list(currentUser: any, organizationId?: string) {
    if (!currentUser?.id) {
      throw new ForbiddenException('User context is required');
    }
    // Check membership in target org
    const targetOrgId = organizationId;
    if (!targetOrgId) throw new ForbiddenException('Organization context is required');
    const myMembership = await this.memberships.findOne({ where: { userId: currentUser.id, organizationId: targetOrgId, isActive: true, invitedPending: false }, relations: ['role'] });
    if (!myMembership) throw new ForbiddenException('Organization context is required');
    const myRole = myMembership.role?.name?.toLowerCase?.() || '';

    // Query members
    const where: any = { organizationId: targetOrgId, isActive: true, invitedPending: false };
    if (!['owner', 'admin'].includes(myRole)) {
      await this.organizationsService.ensureSystemRoles(targetOrgId);
      const viewerRole = await this.roles.findOne({ where: { name: 'viewer', organizationId: targetOrgId } });
      if (viewerRole) where.roleId = viewerRole.id;
    }
    const memberships = await this.memberships.find({ where, relations: ['user', 'role'] });
    return memberships.map((m) => ({
      id: m.user?.id!,
      email: m.user?.email!,
      firstName: m.user?.firstName!,
      lastName: m.user?.lastName!,
      role: m.role?.name ?? null,
      organizationId: m.organizationId,
      isActive: m.isActive,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async invite(currentUser: any, dto: InviteUserDto) {
    const targetOrgId = dto.organizationId;
    if (!targetOrgId) {
      throw new BadRequestException('Organization is required');
    }

    // Defensive check in addition to PermissionsGuard: ensure inviter is an owner of target org
    const inviterMembership = await this.memberships.findOne({
      where: { userId: currentUser?.id, organizationId: targetOrgId, isActive: true, invitedPending: false },
      relations: ['role'],
    });
    if (!inviterMembership || (inviterMembership.role?.name || '').toLowerCase() !== 'owner') {
      throw new ForbiddenException('Only owners can invite users');
    }

    const organization = await this.organizations.findOne({ where: { id: targetOrgId } });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const normalizedRole = dto.role.toLowerCase();
    if (!['admin', 'viewer'].includes(normalizedRole)) {
      throw new BadRequestException('Role must be admin or viewer');
    }

    // Check if a membership already exists
    const existingUser = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    const existingMembership = existingUser
      ? await this.memberships.findOne({ where: { userId: existingUser.id, organizationId: targetOrgId } })
      : null;
    if (existingMembership) {
      if (!existingMembership.isActive && existingMembership.invitedPending) {
        throw new BadRequestException('User has already been invited to this organization');
      }
      throw new BadRequestException('User with that email is already part of this organization');
    }

    await this.organizationsService.ensureSystemRoles(targetOrgId);
    const role = await this.roles.findOne({
      where: {
        name: normalizedRole,
        organizationId: targetOrgId,
      },
    });
    if (!role) {
      throw new NotFoundException('Role not found for organization');
    }

    const email = dto.email.toLowerCase();
    // If user exists, only create a membership invite; else create a brand-new user and membership invite
    let user = existingUser;
    let temporaryPassword: string | undefined;
    if (!user) {
      const [localPart] = email.split('@');
      const derivedFirst = dto.firstName?.trim() || this.capitalize(localPart.split(/[._-]/)[0] || 'User');
      const derivedLast = dto.lastName?.trim() || 'Invitee';
      temporaryPassword = this.generateTemporaryPassword();
      user = this.users.create({
        email,
        firstName: derivedFirst,
        lastName: derivedLast,
        password: temporaryPassword,
      });
      user = await this.users.save(user);
    }

    const membership = this.memberships.create({
      userId: user.id,
      organizationId: targetOrgId,
      roleId: role.id,
      isActive: false,
      invitedPending: true,
    });
    await this.memberships.save(membership);

    return {
      id: user.id,
      email: user.email,
      temporaryPassword: temporaryPassword ?? 'existing-user',
    };
  }

  private capitalize(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  async assignAdmin(currentUser: any, userId: string) {
    // Determine an organization context. For now, use the first active membership we find for the current user
    // and require that membership to be an owner.
    const ownerMemberships = await this.memberships.find({ where: { userId: currentUser.id, isActive: true, invitedPending: false }, relations: ['role'] });
    const orgId = ownerMemberships[0]?.organizationId; // TODO: accept organizationId explicitly when UI provides it
    if (!orgId) throw new ForbiddenException('Owner organization context required');
    if ((ownerMemberships[0]?.role?.name || '').toLowerCase() !== 'owner') {
      throw new ForbiddenException('Only owners can assign admin roles');
    }
    const membership = await this.memberships.findOne({ where: { userId, organizationId: orgId } });
    if (!membership) throw new NotFoundException('User is not part of this organization');

    await this.organizationsService.ensureSystemRoles(orgId);
    const adminRole = await this.roles.findOne({
      where: { name: 'admin', organizationId: orgId },
    });
    if (!adminRole) {
      throw new NotFoundException('Admin role not available');
    }

    if (membership.roleId === adminRole.id) return { success: true };
    membership.roleId = adminRole.id;
    await this.memberships.save(membership);
    return { success: true };
  }

  async assignViewer(currentUser: any, userId: string) {
    const ownerMemberships = await this.memberships.find({ where: { userId: currentUser.id, isActive: true, invitedPending: false }, relations: ['role'] });
    const orgId = ownerMemberships[0]?.organizationId;
    if (!orgId) throw new ForbiddenException('Owner organization context required');
    if ((ownerMemberships[0]?.role?.name || '').toLowerCase() !== 'owner') {
      throw new ForbiddenException('Only owners can assign viewer roles');
    }
    const membership = await this.memberships.findOne({ where: { userId, organizationId: orgId } });
    if (!membership) throw new NotFoundException('User is not part of this organization');

    await this.organizationsService.ensureSystemRoles(orgId);
    const viewerRole = await this.roles.findOne({
      where: { name: 'viewer', organizationId: orgId },
    });
    if (!viewerRole) {
      throw new NotFoundException('Viewer role not available');
    }

    if (membership.roleId === viewerRole.id) return { success: true };
    membership.roleId = viewerRole.id;
    await this.memberships.save(membership);
    return { success: true };
  }

  private generateTemporaryPassword() {
    return randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  }
}
