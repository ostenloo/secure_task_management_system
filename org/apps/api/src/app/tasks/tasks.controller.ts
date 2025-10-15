import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Req, Patch, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard, RolesGuard, PermissionsGuard } from '@org/auth';
import { RequirePermissions, Roles } from '@org/auth';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from './dtos';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class TasksController {
  constructor(private service: TasksService) {}

  @Post()
  @RequirePermissions('tasks:create')
  async create(@Body() dto: CreateTaskDto, @Req() req: any, @Query('organizationId') organizationId?: string) {
    const user = req.user;
    return this.service.create(user, dto, organizationId);
  }

  @Get()
  @RequirePermissions('tasks:read')
  async list(@Req() req: any, @Query('organizationId') organizationId?: string) {
    const user = req.user;
    return this.service.list(user, organizationId);
  }

  @Put(':id')
  @RequirePermissions('tasks:update')
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Req() req: any, @Query('organizationId') organizationId?: string) {
    const user = req.user;
    return this.service.update(user, id, dto, organizationId);
  }

  @Patch(':id/status')
  @RequirePermissions('tasks:move')
  async moveStatus(@Param('id') id: string, @Body() dto: UpdateTaskStatusDto, @Req() req: any, @Query('organizationId') organizationId?: string) {
    const user = req.user;
    return this.service.moveStatus(user, id, dto.status, dto.order, organizationId);
  }

  @Delete(':id')
  @RequirePermissions('tasks:delete')
  async remove(@Param('id') id: string, @Req() req: any, @Query('organizationId') organizationId?: string) {
    const user = req.user;
    return this.service.remove(user, id, organizationId);
  }
}
