import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from './auth.guard';
import type { AuthRequest } from './jwt-payload'; // "type": es solo un tipo

@ApiTags('auth')
@Controller('auth') // rutas /api/auth/...
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register') // POST /api/auth/register → 201
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login') // POST /api/auth/login
  @HttpCode(200) // un login no crea nada: 200 en vez de 201
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 peticiones por minuto
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me') // GET /api/auth/me
  @UseGuards(AuthGuard) // antes de entrar, pasa por el portero
  @ApiBearerAuth()
  me(@Req() request: AuthRequest) {
    return this.authService.me(request.userId); // el id que dejó el AuthGuard
  }
}
