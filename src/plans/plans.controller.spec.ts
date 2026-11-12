import { Test, TestingModule } from '@nestjs/testing';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

describe('PlansController', () => {
  let controller: PlansController;
  let service: { findAll: jest.Mock };

  beforeEach(async () => {
    service = { findAll: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlansController],
      providers: [{ provide: PlansService, useValue: service }],
    }).compile();

    controller = module.get(PlansController);
  });

  it('devuelve lo que devuelve el servicio', async () => {
    const planes = [{ id: 1, name: 'Básico', monthlyPrice: 29.9 }];
    service.findAll.mockResolvedValue(planes);

    const result = await controller.findAll();

    expect(result).toBe(planes);
    expect(service.findAll).toHaveBeenCalled();
  });
});
