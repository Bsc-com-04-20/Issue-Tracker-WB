import { Role } from '../enums/role.enum';

export interface JwtUser {
  sub: number;
  email: string;
  role: Role;
  /** From User.department — used for department-scoped issue lists and access */
  department?: string | null;
}
