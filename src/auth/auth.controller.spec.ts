import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRequest } from './jwt-payload';

describe('AuthController', () => {
  let controller: AuthController;
  let service: { register: jest.Mock; login: jest.Mock; me: jest.Mock };

  beforeEach(async () => {
    service = { register: jest.fn(), login: jest.fn(), me: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: service },
        { provide: JwtService, useValue: {} }, // lo pide el AuthGuard
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  describe('register', () => {
    it('delega en el servicio y devuelve el usuario creado', async () => {
      const dto = { email: 'ana@gym.com', password: '12345678' };
      const creado = { id: 1, email: 'ana@gym.com', role: 'member' };
      service.register.mockResolvedValue(creado);

      const result = await controller.register(dto);

      expect(result).toBe(creado);
      expect(service.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('delega en el servicio y devuelve el token', async () => {
      const dto = { email: 'ana@gym.com', password: '12345678' };
      service.login.mockResolvedValue({ accessToken: 'token-de-ana' });

      const result = await controller.login(dto);

      expect(result).toEqual({ accessToken: 'token-de-ana' });
      expect(service.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('me', () => {
    it('pide al servicio el usuario con el id que dejó el AuthGuard', async () => {
      const ana = { id: 1, email: 'ana@gym.com', role: 'member' };
      service.me.mockResolvedValue(ana);

      const result = await controller.me({ userId: 1 } as AuthRequest);

      expect(result).toBe(ana);
      expect(service.me).toHaveBeenCalledWith(1);
    });
  });
});
