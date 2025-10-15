import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { RoleEntity } from '../entities/role.entity';
import { OrganizationEntity } from '../entities/organization.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UserOrganizationEntity } from '../entities/user-organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RoleEntity, OrganizationEntity, UserOrganizationEntity]), OrganizationsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
