import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { SWAGGER_JWT_AUTH } from '../common/swagger.constants';
import { JwtUser } from '../common/interfaces/jwt-user.interface';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERVISOR, Role.DEPARTMENT_OFFICER)
@ApiBearerAuth(SWAGGER_JWT_AUTH)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary:
      'Paginated audit trail (newest first). Department officers only see Issue audit rows for tickets routed to their unit.',
  })
  findAll(
    @Query() query: PaginationQueryDto,
    @Req() request: Request & { user: JwtUser },
  ) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;
    return this.auditService.findAll(skip, take, request.user);
  }
}
