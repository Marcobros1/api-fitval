import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { PlansModule } from './plans/plans.module';
import { ClassesModule } from './classes/classes.module';

@Module({
  imports: [DatabaseModule, PlansModule, ClassesModule], // para que AppController pueda pedir el Pool
  controllers: [AppController],
})
export class AppModule {}
