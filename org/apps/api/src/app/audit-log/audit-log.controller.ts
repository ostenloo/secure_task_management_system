import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { JwtAuthGuard } from '@org/auth';
import { RequirePermissions, PermissionsGuard } from '@org/auth';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogController {
  constructor(
    @InjectRepository(AuditLogEntity) private audit: Repository<AuditLogEntity>
  ) {}

  @Get()
  @RequirePermissions('audit-logs:read')
  async list() {
    return this.audit.find({ order: { timestamp: 'DESC' } });
  }
}
