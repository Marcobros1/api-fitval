import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuthRequest } from './jwt-payload';

// AUTORIZACIÓN: ¿puedes hacerlo?
// 401 si el usuario ya no existe en la base de datos.
// 403 si existe pero no es personal del gimnasio.
@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {} // para leer el rol

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();

    // El AuthGuard ya puso el id en la petición; ahora leemos el rol de la BD
    const user = await this.usersService.findById(request.userId);
    if (!user) {
      throw new UnauthorizedException('El usuario ya no existe');
    }
    if (user.role !== 'staff') {
      throw new ForbiddenException('Solo para el personal del gimnasio');
    }

    return true; // puede pasar
  }
}
