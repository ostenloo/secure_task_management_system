import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RoleEntity } from '../entities/role.entity';
import { SYSTEM_ROLE_PERMISSIONS } from '../shared/system-permissions';

@Injectable()
export class RbacService {
  constructor(@InjectRepository(RoleEntity) private roles: Repository<RoleEntity>) {}

  async getRoleWithInheritance(roleId: string) {
    // Load the role with its permissions and inheritance graph (one level at a time)
    const visited = new Set<string>();
    const queue: string[] = [roleId];
    const perms = new Set<string>();
  let roleName: string | undefined;

    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const role = await this.roles.findOne({
        where: { id },
        relations: ['permissions', 'inheritsFrom', 'inheritsFrom.permissions'],
      });
      if (!role) continue;
      if (!roleName) roleName = role.name;
      for (const p of role.permissions || []) perms.add(`${p.resource}:${p.action}`);
      for (const r of role.inheritsFrom || []) {
        queue.push(r.id);
        for (const p of r.permissions || []) perms.add(`${p.resource}:${p.action}`);
      }
    }

    // Also merge in system-defined permission names based on role name to avoid stale DB role permissions
    if (roleName && SYSTEM_ROLE_PERMISSIONS[roleName]) {
      for (const p of SYSTEM_ROLE_PERMISSIONS[roleName]) perms.add(p);
    }
    return { roleName, permissions: Array.from(perms) };
  }
}
