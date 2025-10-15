import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '../entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { RbacService } from './rbac.service';
import { UserOrganizationEntity } from '../entities/user-organization.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private users: Repository<UserEntity>,
    @InjectRepository(UserOrganizationEntity) private memberships: Repository<UserOrganizationEntity>,
    private jwt: JwtService,
    private rbac: RbacService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserEntity> {
    // Fetch the account by email and verify password
    const users = await this.users
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email })
      .getMany();

    if (!users || users.length === 0) throw new UnauthorizedException('Invalid credentials');

    const matching: UserEntity[] = [];
    for (const u of users) {
      const ok = await bcrypt.compare(password, u.password);
      if (ok) matching.push(u);
    }
    if (matching.length === 0) throw new UnauthorizedException('Invalid credentials');

    // Single global user row; pick the first match
    return matching[0];
  }

  async login(user: UserEntity) {
    const activeMemberships = await this.memberships.find({
      where: { userId: user.id, isActive: true, invitedPending: false },
      relations: ['role', 'role.permissions', 'role.inheritsFrom', 'role.inheritsFrom.permissions', 'organization'],
    });
    if (!activeMemberships.length) {
      throw new UnauthorizedException('No active organization memberships found');
    }

    const membershipDtos = activeMemberships.map((m) => ({
      membershipId: m.id,
      organizationId: m.organizationId,
      organizationName: m.organization?.name ?? 'Organization',
      roleId: m.roleId,
      roleName: m.role?.name ?? null,
    }));

    const permSet = new Set<string>();
    for (const m of activeMemberships) {
      if (!m.role) continue;
      const { permissions } = await this.rbac.getRoleWithInheritance(m.roleId);
      for (const p of permissions) permSet.add(p);
    }
    const aggregatedPermissions = Array.from(permSet);

    const payload = {
      sub: user.id,
      email: user.email,
    };
    const accessToken = await this.jwt.signAsync(payload);
    const defaultMembership = membershipDtos[0] ?? null;
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        defaultOrganizationId: defaultMembership?.organizationId ?? null,
        memberships: membershipDtos,
        permissions: aggregatedPermissions,
      },
      token: accessToken,
    };
  }
}
