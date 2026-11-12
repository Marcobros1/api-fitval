import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

function contextWith(authorization?: string) {
  const request: { headers: { authorization?: string }; userId?: number } = {
    headers: { authorization },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: { verifyAsync: jest.Mock };

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    guard = new AuthGuard(jwtService as unknown as JwtService);
  });

  it('deja pasar con un token válido y guarda el id en la petición', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 1 });
    const { context, request } = contextWith('Bearer token-valido');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('token-valido');
    expect(request.userId).toBe(1);
  });

  it('lanza UnauthorizedException si falta la cabecera', async () => {
    const { context } = contextWith(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Falta el token'),
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('lanza UnauthorizedException si el tipo no es Bearer', async () => {
    const { context } = contextWith('Basic token-valido');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Falta el token'),
    );
  });

  it('lanza UnauthorizedException si pone Bearer sin token', async () => {
    const { context } = contextWith('Bearer');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Falta el token'),
    );
  });

  it('lanza UnauthorizedException si el token no es válido o ha caducado', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    const { context, request } = contextWith('Bearer token-roto');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Token no válido o caducado'),
    );
    expect(request.userId).toBeUndefined();
  });
});
