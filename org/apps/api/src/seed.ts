import 'reflect-metadata';
import path from 'path';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createDataSource } from './app/database.config';
import { OrganizationEntity } from './app/entities/organization.entity';
import { PermissionEntity } from './app/entities/permission.entity';
import { RoleEntity } from './app/entities/role.entity';
import { UserEntity } from './app/entities/user.entity';
import { UserOrganizationEntity } from './app/entities/user-organization.entity';
import { SYSTEM_PERMISSION_DEFINITIONS, SYSTEM_ROLE_PERMISSIONS } from './app/shared/system-permissions';

async function main() {
  // Load env from repo root (org/.env)
  dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });

  const config = new ConfigService();
  const ds: DataSource = createDataSource(config);
  await ds.initialize();
  console.log('Connected to database');

  const orgRepo = ds.getRepository(OrganizationEntity);
  const permRepo = ds.getRepository(PermissionEntity);
  const roleRepo = ds.getRepository(RoleEntity);
  const userRepo = ds.getRepository(UserEntity);
  const membershipRepo = ds.getRepository(UserOrganizationEntity);

  // 1) Organization
  let org = await orgRepo.findOne({ where: { name: 'Acme Corp' } });
  if (!org) {
    org = orgRepo.create({ name: 'Acme Corp', isActive: true });
    org = await orgRepo.save(org);
    console.log('Created organization:', org.name);
  }
  const orgId = org!.id;

  // 2) Permissions
  const permsByName: Record<string, PermissionEntity> = {};
  for (const def of SYSTEM_PERMISSION_DEFINITIONS) {
    let found = await permRepo.findOne({ where: { resource: def.resource, action: def.action } });
    if (!found) {
      found = permRepo.create({ name: def.name, resource: def.resource, action: def.action });
      found = await permRepo.save(found);
      console.log('Created permission:', found.name);
    }
    permsByName[def.name] = found;
  }

  // 3) Roles (owner/admin/viewer)
  async function ensureRole(name: string, isSystemRole = true, permissionNames: string[] = []) {
    let role = await roleRepo.findOne({ where: { name, organizationId: orgId } });
    if (!role) {
      role = roleRepo.create({ name, organizationId: orgId, isSystemRole });
    }
    if (permissionNames.length) {
      const rolePerms = permissionNames
        .map((n) => permsByName[n])
        .filter(Boolean);
      role.permissions = rolePerms;
    }
    role = await roleRepo.save(role);
    console.log('Upserted role:', role.name);
    return role;
  }

  const owner = await ensureRole('owner', true, SYSTEM_ROLE_PERMISSIONS.owner);
  const admin = await ensureRole('admin', true, SYSTEM_ROLE_PERMISSIONS.admin);
  const viewer = await ensureRole('viewer', true, SYSTEM_ROLE_PERMISSIONS.viewer);

  // 4) Ensure global users (email is globally unique). Memberships handle org/role.
  async function ensureGlobalUser(email: string, firstName: string, lastName: string, pwd = 'password') {
    let u = await userRepo.findOne({ where: { email } });
    if (!u) {
      u = userRepo.create({ email, firstName, lastName, password: pwd });
      u = await userRepo.save(u);
      console.log('Created user:', u.email);
    } else {
      console.log('User already exists:', u.email);
      if (email === 'owner@123.com' && process.env.RESET_ADMIN_PASSWORD === 'true') {
        u.password = 'password';
        await userRepo.save(u);
        console.log('Admin password reset via RESET_ADMIN_PASSWORD flag');
      }
    }
    return u;
  }

  const ownerUser = await ensureGlobalUser('owner@123.com', 'Owner', 'Person');
  const adminUser = await ensureGlobalUser('user1@123.com', 'User', 'One');
  const viewerUser1 = await ensureGlobalUser('user2@123.com', 'User', 'Two');
  const viewerUser2 = await ensureGlobalUser('user3@123.com', 'User', 'Three');

  // 5) Ensure memberships for Acme Corp
  async function ensureMembership(userId: string, organizationId: string, roleId: string, options?: { active?: boolean; pending?: boolean }) {
    let m = await membershipRepo.findOne({ where: { userId, organizationId } });
    if (!m) {
      m = membershipRepo.create({
        userId,
        organizationId,
        roleId,
        isActive: options?.active ?? true,
        invitedPending: options?.pending ?? false,
      });
      await membershipRepo.save(m);
      console.log('Created membership:', { userId, organizationId, roleId });
    } else {
      let changed = false;
      if (m.roleId !== roleId) { m.roleId = roleId; changed = true; }
      const desiredActive = options?.active ?? true;
      const desiredPending = options?.pending ?? false;
      if (m.isActive !== desiredActive) { m.isActive = desiredActive; changed = true; }
      if (m.invitedPending !== desiredPending) { m.invitedPending = desiredPending; changed = true; }
      if (changed) {
        await membershipRepo.save(m);
        console.log('Updated membership:', { userId, organizationId, roleId });
      }
    }
  }

  await ensureMembership(ownerUser.id, org.id, owner.id, { active: true, pending: false });
  await ensureMembership(adminUser.id, org.id, admin.id, { active: true, pending: false });
  await ensureMembership(viewerUser1.id, org.id, viewer.id, { active: true, pending: false });
  await ensureMembership(viewerUser2.id, org.id, viewer.id, { active: true, pending: false });

  await ds.destroy();
  console.log('Seed completed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
