import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '@org/auth';
import { LoginDto } from './dtos';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Public()
  async login(@Body() body: LoginDto) {
    const user = await this.auth.validateUser(body.email, body.password);
    return this.auth.login(user);
  }
}
