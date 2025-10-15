import { Body, Controller, Get, Param, Post, Req, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard, PermissionsGuard, RolesGuard, RequirePermissions } from '@org/auth';
import { UsersService } from './users.service';
import { InviteUserDto } from './dtos';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('')
  async list(@Req() req: any, @Query('organizationId') organizationId?: string) {
    return this.users.list(req.user, organizationId);
  }

  @Post('invite')
  @RequirePermissions('users:invite')
  async invite(@Body() dto: InviteUserDto, @Req() req: any) {
    return this.users.invite(req.user, dto);
  }

  @Post(':id/assign-admin')
  @RequirePermissions('users:assign-admin')
  async assignAdmin(@Param('id') id: string, @Req() req: any) {
    return this.users.assignAdmin(req.user, id);
  }

  @Post(':id/assign-viewer')
  @RequirePermissions('users:assign-viewer')
  async assignViewer(@Param('id') id: string, @Req() req: any) {
    return this.users.assignViewer(req.user, id);
  }
}
 
