import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';

describe('ClassesController', () => {
  let controller: ClassesController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    };
    controller = new ClassesController(service as unknown as ClassesService);
  });

  describe('findAll', () => {
    it('devuelve lo que devuelve el servicio', async () => {
      const clases = [
        { id: 1, activity: 'Spinning', trainerName: 'Carla Navarro' },
      ];
      service.findAll.mockResolvedValue(clases);

      const result = await controller.findAll('yoga');

      expect(result).toBe(clases);
      expect(service.findAll).toHaveBeenCalledWith('yoga');
    });
  });

  describe('findOne', () => {
    it('devuelve la clase pedida por id', async () => {
      const clase = {
        id: 7,
        activity: 'Crossfit',
        trainerName: 'Carla Navarro',
      };
      service.findOne.mockResolvedValue(clase);

      const result = await controller.findOne(7);

      expect(result).toBe(clase);
      expect(service.findOne).toHaveBeenCalledWith(7);
    });
  });

  describe('create', () => {
    it('delega en el servicio y devuelve lo creado', async () => {
      const dto: CreateClassDto = {
        activity: 'Fuerza',
        room: 'Sala 3',
        startsAt: '2026-11-10T18:00:00Z',
        spots: 15,
        trainerId: 4,
      };
      const creada = { id: 8, activity: 'Fuerza', trainerName: 'Rubén Castro' };
      service.create.mockResolvedValue(creada);

      const result = await controller.create(dto);

      expect(result).toBe(creada);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('remove', () => {
    it('delega en el servicio y devuelve la clase borrada', async () => {
      const borrada = {
        id: 8,
        activity: 'Fuerza',
        trainerName: 'Rubén Castro',
      };
      service.remove.mockResolvedValue(borrada);

      const result = await controller.remove(8);

      expect(result).toBe(borrada);
      expect(service.remove).toHaveBeenCalledWith(8);
    });
  });
});
