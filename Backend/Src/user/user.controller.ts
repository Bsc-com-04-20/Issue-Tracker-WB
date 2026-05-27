import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { SWAGGER_JWT_AUTH } from '../common/swagger.constants';

@ApiTags('users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('bootstrap-admin')
  @ApiOperation({
    summary: 'Create default admin if database is empty (dev convenience)',
  })
  bootstrapAdmin() {
    return this.userService.bootstrapAdmin();
  }

  @Get('health')
  @ApiOperation({ summary: 'Simple health check' })
  health() {
    return { ok: true };
  }

  @Get('technicians')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.DEPARTMENT_OFFICER)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary: 'List active technicians (assignment / dispatch pickers)',
  })
  listTechnicians() {
    return this.userService.findActiveTechnicians();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({ summary: 'List users (paginated)' })
  findAll(@Query() query: PaginationQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;
    return this.userService.findAll(skip, take);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({ summary: 'Get user by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOneSafe(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({ summary: 'Update user profile / role / active flag' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(id, dto);
  }

  @Patch(':id/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({ summary: 'Set user password (admin reset)' })
  updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserPasswordDto,
  ) {
    return this.userService.updatePassword(id, dto.newPassword);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({ summary: 'Create user (admin only)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
}
