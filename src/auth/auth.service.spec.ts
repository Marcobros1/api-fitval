import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user';

jest.mock('argon2');

const ANA: User = {
  id: 1,
  email: 'ana@gym.com',
  password_hash: 'hash-de-ana',
  role: 'member',
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };
  const hash = argon2.hash as jest.Mock;
  const verify = argon2.verify as jest.Mock;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    jwtService = { signAsync: jest.fn() };
    hash.mockReset();
    verify.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  describe('register', () => {
    const dto = { email: 'ana@gym.com', password: '12345678' };

    it('guarda el hash y devuelve el usuario sin el hash', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);
      hash.mockResolvedValue('hash-de-ana');
      usersService.create.mockResolvedValue(ANA);

      const result = await service.register(dto);

      expect(result).toEqual({ id: 1, email: 'ana@gym.com', role: 'member' });
      expect(hash).toHaveBeenCalledWith('12345678');
      expect(usersService.create).toHaveBeenCalledWith(
        'ana@gym.com',
        'hash-de-ana',
      );
    });

    it('lanza ConflictException si el correo ya existe', async () => {
      usersService.findByEmail.mockResolvedValue(ANA);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('lanza ConflictException si la base de datos rechaza un correo repetido', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);
      hash.mockResolvedValue('hash-de-ana');
      usersService.create.mockRejectedValue({ code: '23505' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('deja pasar otros errores de la base de datos', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);
      hash.mockResolvedValue('hash-de-ana');
      const error = new Error('conexión perdida');
      usersService.create.mockRejectedValue(error);

      await expect(service.register(dto)).rejects.toBe(error);
    });
  });

  describe('login', () => {
    const dto = { email: 'ana@gym.com', password: '12345678' };

    it('devuelve un token con solo el id del usuario', async () => {
      usersService.findByEmail.mockResolvedValue(ANA);
      verify.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('token-de-ana');

      const result = await service.login(dto);

      expect(result).toEqual({ accessToken: 'token-de-ana' });
      expect(verify).toHaveBeenCalledWith('hash-de-ana', '12345678');
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 1 });
    });

    it('lanza UnauthorizedException si la contraseña no encaja', async () => {
      usersService.findByEmail.mockResolvedValue(ANA);
      verify.mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Correo o contraseña incorrectos'),
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('lanza el mismo error si el correo no existe', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Correo o contraseña incorrectos'),
      );
      expect(verify).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('devuelve los datos del usuario sin el hash', async () => {
      usersService.findById.mockResolvedValue(ANA);

      const result = await service.me(1);

      expect(result).toEqual({ id: 1, email: 'ana@gym.com', role: 'member' });
      expect(usersService.findById).toHaveBeenCalledWith(1);
    });

    it('lanza UnauthorizedException si el usuario ya no existe', async () => {
      usersService.findById.mockResolvedValue(undefined);

      await expect(service.me(99)).rejects.toThrow(UnauthorizedException);
    });
  });
});
