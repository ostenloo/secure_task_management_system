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
    // Aggregate permissions across all active, non-pending memberships
    const activeMemberships = await this.memberships.find({
      where: { userId: user.id, isActive: true, invitedPending: false },
      relations: ['role', 'role.permissions', 'role.inheritsFrom', 'role.inheritsFrom.permissions'],
    });

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
      permissions: aggregatedPermissions,
    } as any;
    const accessToken = await this.jwt.signAsync(payload);
    return {
      user: {
        ...user,
        password: undefined,
        roleName: null,
        permissions: aggregatedPermissions,
      },
      token: accessToken,
    };
  }
}
