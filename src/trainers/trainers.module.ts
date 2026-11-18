import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';

@Module({
  imports: [
    DatabaseModule, // para que TrainersService pueda pedir el Pool
    UsersModule, // StaffGuard necesita UsersService para leer el rol
  ],
  controllers: [TrainersController],
  providers: [
    TrainersService,
    AuthGuard, // protege POST
    StaffGuard, // solo staff puede crear monitores
  ],
})
export class TrainersModule {}
