import { ForbiddenException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../entities/user.entity';
import { RbacService } from './rbac.service';
import { UserOrganizationEntity } from '../entities/user-organization.entity';
import { Request } from 'express';

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
      passReqToCallback: true,
    });
  }

  private extractOrgId(req: Request): string | undefined {
    const header = req.headers['x-org-id'] ?? req.headers['x-organization-id'];
    const headerOrg = this.normalizeOrgCandidate(header);
    if (headerOrg) return headerOrg;

    const queryValue = req.query?.['organizationId'] ?? req.query?.['orgId'];
    const queryOrg = this.normalizeOrgCandidate(queryValue);
    if (queryOrg) return queryOrg;

    if (req.body && typeof req.body === 'object') {
      const body = req.body as Record<string, unknown>;
      const bodyValue = body.organizationId ?? body.orgId;
      return this.normalizeOrgCandidate(bodyValue);
    }

    return undefined;
  }

  private normalizeOrgCandidate(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      const [first] = value;
      return typeof first === 'string' ? first : undefined;
    }
    if (typeof value === 'string') return value;
    return undefined;
  }

  async validate(req: Request, payload: any) {
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) return null;
    const requestedOrgId = this.extractOrgId(req);

    const activeMemberships = await this.memberships.find({
      where: { userId: user.id, isActive: true, invitedPending: false },
      relations: ['role'],
    });

    if (!requestedOrgId) {
      return {
        id: user.id,
        email: user.email,
        organizationId: null,
        roleId: null,
        roleName: null,
        permissions: [],
        membershipId: null,
        isOwner: activeMemberships.some((m) => (m.role?.name || '').toLowerCase() === 'owner'),
      };
    }

    const membership = activeMemberships.find((m) => m.organizationId === requestedOrgId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of the requested organization');
    }

    const { roleName, permissions } = await this.rbac.getRoleWithInheritance(membership.roleId);
    const normalizedRole = (roleName || '').toLowerCase();
    return {
      id: user.id,
      email: user.email,
      organizationId: membership.organizationId,
      roleId: membership.roleId,
      roleName,
      permissions,
      membershipId: membership.id,
      isOwner: normalizedRole === 'owner',
    };
  }
}
