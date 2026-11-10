import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { PlansModule } from './plans/plans.module';

@Module({
  imports: [DatabaseModule, PlansModule], // para que AppController pueda pedir el Pool
  controllers: [AppController],
})
export class AppModule {}
