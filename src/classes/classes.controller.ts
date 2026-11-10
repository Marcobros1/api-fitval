import { Controller, Get } from '@nestjs/common';
import { ClassesService } from './classes.service';
@Controller('classes')
export class ClassesController {
  constructor(private readonly classService: ClassesService) {}

  @Get() // GET /api/classes
  findAll() {
    return this.classService.findAll();
  }
}
