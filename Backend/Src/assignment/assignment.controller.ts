import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AssignmentService } from './assignment.service';
import { AssignIssueDto } from './dto/assign-issue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { SWAGGER_JWT_AUTH } from '../common/swagger.constants';

@ApiTags('assignments')
@Controller('assignment')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.SUPERVISOR,
    Role.INTAKE_OFFICER,
    Role.DEPARTMENT_OFFICER,
  )
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Assign from reported→assigned, or reassign while assigned. Intake officers may assign any reported issue. Department officers may assign only issues routed to their unit (User.department).',
  })
  assign(
    @Body() dto: AssignIssueDto,
    @Req() request: Request & { user: JwtUser },
  ) {
    return this.assignmentService.assign(dto, request.user.sub);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TECHNICIAN)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({ summary: 'List assignments for the logged-in technician' })
  listMine(@Req() request: Request & { user: JwtUser }) {
    return this.assignmentService.findForTechnician(request.user.sub);
  }
}
