import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [DatabaseModule], // para que ClassesService pueda pedir el Pool
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
