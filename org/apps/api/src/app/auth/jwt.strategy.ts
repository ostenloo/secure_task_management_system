import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../entities/user.entity';
import { RbacService } from './rbac.service';
import { InjectRepository as InjectRepo } from '@nestjs/typeorm';
import { UserOrganizationEntity } from '../entities/user-organization.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    @InjectRepository(UserEntity) private users: Repository<UserEntity>,
    private rbac: RbacService,
    @InjectRepository(UserOrganizationEntity) private memberships: Repository<UserOrganizationEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'dev-secret',
    });
  }

  async validate(payload: any) {
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) return null;
    // Recompute permissions each request to avoid stale tokens when role maps change; services still enforce per-org
    const activeMemberships = await this.memberships.find({ where: { userId: user.id, isActive: true, invitedPending: false } });
    const permSet = new Set<string>();
    for (const m of activeMemberships) {
      const { permissions } = await this.rbac.getRoleWithInheritance(m.roleId);
      for (const p of permissions) permSet.add(p);
    }
    return {
      id: user.id,
      email: user.email,
      roleName: null,
      permissions: Array.from(permSet),
    };
  }
}
