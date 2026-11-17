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
  Version,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { ListClassesQueryDto } from './dto/list-classes-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';

@Controller('classes') // rutas /api/classes
export class ClassesController {
  constructor(private readonly classService: ClassesService) {}

  @Get() // GET /api/v1/classes y GET /api/v1/classes?activity=yoga (sin guard)
  findAll(@Query('activity') activity?: string) {
    return this.classService.findAll(activity);
  }

  @Get(':id') // GET /api/v1/classes/7 (sin guard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classService.findOne(id);
  }

  @Post() //POST /api/v1/classes (solo staff)
  @UseGuards(AuthGuard, StaffGuard)
  create(@Body() dto: CreateClassDto) {
    return this.classService.create(dto);
  }

  @Delete(':id') //DELETE /api/v1/classes/:id (solo staff)
  @UseGuards(AuthGuard, StaffGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.classService.remove(id);
  }

  // v2: paginación
  @Version('2')
  @Get()
  findPage(@Query() query: ListClassesQueryDto) {
    return this.classService.findPage(query);
  }
}
