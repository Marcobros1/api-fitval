// Un usuario tal y como está en la tabla users
export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: 'member' | 'staff';
}
