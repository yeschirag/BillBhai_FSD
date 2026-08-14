import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { generateToken } from '../../common/utils/jwt.util';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  validateCredentials(username: string, password: string) {
    const user = this.usersService.findByUsernameAndPassword(
      username,
      password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      companyId: user.companyId,
      email: user.email,
    });

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      companyId: user.companyId,
      token,
    };
  }
}
