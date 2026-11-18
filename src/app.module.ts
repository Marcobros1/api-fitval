import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { PlansModule } from './plans/plans.module';
import { ClassesModule } from './classes/classes.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TrainersModule } from './trainers/trainers.module';

@Module({
  imports: [
    DatabaseModule,
    PlansModule,
    ClassesModule,
    UsersModule,
    AuthModule,
    TrainersModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto
        limit: 20, // 20 peticiones por minuto
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
