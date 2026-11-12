import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule, // para poder pedir el UsersService
    JwtModule.registerAsync({
      global: true, // el JwtService se puede usar en todos los módulos
      useFactory: () => ({
        secret: process.env.JWT_SECRET, // la clave para firmar, del .env
        signOptions: { expiresIn: '1h' }, // el token caduca en 1 hora
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
