import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Req, Patch } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard, PermissionsGuard } from '@org/auth';
import { RequirePermissions } from '@org/auth';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from './dtos';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private service: TasksService) {}

  @Post()
  @RequirePermissions('tasks:create')
  async create(@Body() dto: CreateTaskDto, @Req() req: any) {
    const user = req.user;
    return this.service.create(user, dto);
  }

  @Get()
  @RequirePermissions('tasks:read')
  async list(@Req() req: any) {
    const user = req.user;
    return this.service.list(user);
  }

  @Put(':id')
  @RequirePermissions('tasks:update')
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Req() req: any) {
    const user = req.user;
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('tasks:move')
  async moveStatus(@Param('id') id: string, @Body() dto: UpdateTaskStatusDto, @Req() req: any) {
    const user = req.user;
    return this.service.moveStatus(user, id, dto.status, dto.order);
  }

  @Delete(':id')
  @RequirePermissions('tasks:delete')
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.service.remove(user, id);
  }
}
