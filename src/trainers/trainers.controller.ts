import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TrainersService } from './trainers.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';

@Controller('trainers') // rutas /api/trainers (con versioning: /api/v1/trainers, /api/v2/trainers)
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  @Get(':id') // GET /api/v1/trainers/:id - cualquiera
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.trainersService.findOne(id);
  }

  @Post() // POST /api/v1/trainers - solo staff
  @UseGuards(AuthGuard, StaffGuard)
  create(@Body() dto: CreateTrainerDto) {
    return this.trainersService.create(dto);
  }
}
