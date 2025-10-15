import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { JwtAuthGuard, RolesGuard } from '@org/auth';
import { Roles } from '@org/auth';
import { SystemRole } from '@org/data';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(
    @InjectRepository(AuditLogEntity) private audit: Repository<AuditLogEntity>
  ) {}

  @Get()
  @Roles(SystemRole.OWNER, SystemRole.ADMIN)
  async list() {
    return this.audit.find({ order: { timestamp: 'DESC' } });
  }
}
