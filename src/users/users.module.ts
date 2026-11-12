import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule], // para poder pedir el Pool
  providers: [UsersService],
  exports: [UsersService], // lo usará el módulo de autenticación
})
export class UsersModule {}
