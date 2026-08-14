import { Controller, Get, Redirect } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Redirect('/api', 301)
  getHello() {
    return { url: '/api', statusCode: 301 };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      application: 'BillBhai Backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
