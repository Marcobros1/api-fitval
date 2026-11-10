import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule], // para que AppController pueda pedir el Pool
  controllers: [AppController],
})
export class AppModule {}
