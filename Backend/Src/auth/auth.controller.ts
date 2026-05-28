import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenBodyDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(201)
  @Throttle({
    default: {
      limit: Number(process.env.LOGIN_THROTTLE_LIMIT ?? 60),
      ttl: Number(process.env.LOGIN_THROTTLE_TTL_MS ?? 60000),
    },
  })
  @ApiOperation({
    summary: 'Login (access + refresh token); rate-limited per IP',
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(201)
  @ApiOperation({ summary: 'Exchange refresh token for a new access token' })
  refresh(@Body() body: RefreshTokenBodyDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(201)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  logout(@Body() body: RefreshTokenBodyDto) {
    return this.authService.logout(body.refreshToken);
  }
}
