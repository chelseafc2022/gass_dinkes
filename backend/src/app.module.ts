import { Module, Controller, Get } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { PrismaService } from "./prisma/prisma.service";
import { AccessGuard, Public } from "./auth/security";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { EgovService } from "./auth/egov.service";
import { MasterController } from "./master/master.controller";
import { MasterService } from "./master/master.service";
import { ReportsController } from "./reports/reports.controller";
import { ReportsService } from "./reports/reports.service";
import { AdminController } from "./admin/admin.controller";
import { NotificationsService } from "./notifications/notifications.service";
@Controller("health")
class HealthController {
  @Public() @Get() health() {
    return { status: "ok", service: "GASS" };
  }
}
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({}),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
  ],
  controllers: [
    HealthController,
    AuthController,
    MasterController,
    ReportsController,
    AdminController,
  ],
  providers: [
    PrismaService,
    AuthService,
    EgovService,
    MasterService,
    ReportsService,
    NotificationsService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
})
export class AppModule {}
