import { Body, Controller, Get, Post, Req, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '@org/auth';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dtos';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  @RequirePermissions('organizations:create')
  async create(@Body() dto: CreateOrganizationDto, @Req() req: any) {
    return this.organizations.createOrganization(req.user, dto);
  }

  @Get()
  async list(@Req() req: any) {
    return this.organizations.listOrganizations(req.user);
  }

  @Get('invitations')
  async invitations(@Req() req: any) {
    return this.organizations.listInvitations(req.user);
  }

  @Post('invitations/:membershipId/accept')
  async accept(@Param('membershipId') membershipId: string, @Req() req: any) {
    return this.organizations.acceptInvitation(req.user, membershipId);
  }

  @Post('invitations/:membershipId/decline')
  async decline(@Param('membershipId') membershipId: string, @Req() req: any) {
    return this.organizations.declineInvitation(req.user, membershipId);
  }
}
