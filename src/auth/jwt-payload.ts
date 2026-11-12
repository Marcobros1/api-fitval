import { Request } from 'express';

// Lo ÚNICO que guardamos dentro del token: el id del usuario
export interface JwtPayload {
  sub: number; // "subject": el id del usuario
}

// Una petición que ya ha pasado por el AuthGuard: lleva el id del usuario
export interface AuthRequest extends Request {
  userId: number;
}
