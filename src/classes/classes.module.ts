import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [
    DatabaseModule, // para que ClassesService pueda pedir el Pool
    UsersModule, // StaffGuard necesita el UsersService para leer el rol
  ],
  controllers: [ClassesController],
  providers: [
    ClassesService,
    AuthGuard, // protege POST y DELETE de clases
    StaffGuard, // solo staff puede crear y borrar clases
  ],
})
export class ClassesModule {}
