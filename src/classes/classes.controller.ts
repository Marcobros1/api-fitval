import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';

@Controller('classes') // rutas /api/classes
export class ClassesController {
  constructor(private readonly classService: ClassesService) {}

  @Get() // GET /api/classes y GET /api/classes?activity=yoga (sin guard)
  findAll(@Query('activity') activity?: string) {
    return this.classService.findAll(activity);
  }

  @Get(':id') // GET /api/classes/7 (sin guard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classService.findOne(id);
  }

  @Post() //POST /api/classes (solo staff)
  @UseGuards(AuthGuard, StaffGuard)
  create(@Body() dto: CreateClassDto) {
    return this.classService.create(dto);
  }

  @Delete(':id') //DELETE /api/classes/:id (solo staff)
  @UseGuards(AuthGuard, StaffGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.classService.remove(id);
  }
}
