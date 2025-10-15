import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationEntity } from '../entities/organization.entity';
import { RoleEntity } from '../entities/role.entity';
import { PermissionEntity } from '../entities/permission.entity';
import { OrganizationsService } from './organizations.service';
import { UserEntity } from '../entities/user.entity';
import { UserOrganizationEntity } from '../entities/user-organization.entity';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationEntity, RoleEntity, PermissionEntity, UserEntity, UserOrganizationEntity])],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
