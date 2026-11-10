import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [DatabaseModule], // para que PlansService pueda pedir el Pool
  controllers: [PlansController],
  providers: [PlansService],
})
export class PlansModule {}
