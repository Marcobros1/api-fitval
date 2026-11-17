import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { StaffGuard } from './staff.guard';

function contextWith(userId: number) {
  const request: { userId: number } = { userId };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('StaffGuard', () => {
  let guard: StaffGuard;
  let usersService: { findById: jest.Mock };

  beforeEach(() => {
    usersService = { findById: jest.fn() };
    guard = new StaffGuard(usersService as unknown as UsersService);
  });

  it('deja pasar al personal (staff)', async () => {
    usersService.findById.mockResolvedValue({ id: 1, role: 'staff' });
    const { context } = contextWith(1);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(usersService.findById).toHaveBeenCalledWith(1);
  });

  it('no deja pasar a un socio (member) → 403', async () => {
    usersService.findById.mockResolvedValue({ id: 1, role: 'member' });
    const { context } = contextWith(1);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Solo para el personal del gimnasio'),
    );
    expect(usersService.findById).toHaveBeenCalledWith(1);
  });

  it('no deja pasar si el usuario ya no existe → 401', async () => {
    usersService.findById.mockResolvedValue(undefined);
    const { context } = contextWith(1);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('El usuario ya no existe'),
    );
    expect(usersService.findById).toHaveBeenCalledWith(1);
  });
});
