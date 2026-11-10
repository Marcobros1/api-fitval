import { Controller, Get } from '@nestjs/common';
import { PlansService } from './plans.service';

@Controller('plans') // rutas /api/plans
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get() // GET /api/plans
  findAll() {
    return this.plansService.findAll();
  }
}
