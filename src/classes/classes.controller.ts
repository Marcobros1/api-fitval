import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ClassesService } from './classes.service';

@Controller('classes') // rutas /api/classes
export class ClassesController {
  constructor(private readonly classService: ClassesService) {}

  @Get() // GET /api/classes y GET /api/classes?activity=yoga
  findAll(@Query('activity') activity?: string) {
    return this.classService.findAll(activity);
  }

  @Get(':id') // GET /api/classes/7 (ParseIntPipe responde 400 si no es un número)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classService.findOne(id);
  }
}
