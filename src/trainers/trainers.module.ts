import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [TrainersController],
  providers: [TrainersService, AuthGuard, StaffGuard],
})
export class TrainersModule {}
