import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from '../entities/task.entity';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { UserEntity } from '../entities/user.entity';
import { UserOrganizationEntity } from '../entities/user-organization.entity';
import { OrganizationEntity } from '../entities/organization.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity, AuditLogEntity, UserEntity, UserOrganizationEntity, OrganizationEntity])],
  providers: [TasksService],
  controllers: [TasksController],
})
export class TasksModule {}
