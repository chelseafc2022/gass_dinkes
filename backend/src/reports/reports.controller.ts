import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { CurrentUser, Menu } from "../auth/security";
import type { Actor } from "../common/policy";
import { ReportsService, filters } from "./reports.service";
@Controller()
export class ReportsController {
  constructor(private service: ReportsService) {}
  @Menu("capaian_kinerja") @Get("capaian/kinerja") k(
    @CurrentUser() u: Actor,
    @Query() q: any,
  ) {
    return this.service.list("kinerja", u, filters.parse(q));
  }
  @Menu("capaian_keuangan") @Get("capaian/keuangan") f(
    @CurrentUser() u: Actor,
    @Query() q: any,
  ) {
    return this.service.list("keuangan", u, filters.parse(q));
  }
  @Menu("capaian_kinerja") @Put("capaian/kinerja") saveK(
    @CurrentUser() u: Actor,
    @Body() b: unknown,
  ) {
    return this.service.save("kinerja", u, b);
  }
  @Menu("capaian_keuangan") @Put("capaian/keuangan") saveF(
    @CurrentUser() u: Actor,
    @Body() b: unknown,
  ) {
    return this.service.save("keuangan", u, b);
  }
  @Menu("capaian_kinerja") @Post("capaian/kinerja/:id/verify") verifyK(
    @CurrentUser() u: Actor,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.verify("kinerja", id, u, b);
  }
  @Menu("capaian_keuangan") @Post("capaian/keuangan/:id/verify") verifyF(
    @CurrentUser() u: Actor,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.verify("keuangan", id, u, b);
  }
  @Menu("capaian_kinerja") @Delete("capaian/kinerja/:id") deleteK(
    @CurrentUser() u: Actor,
    @Param("id") id: string,
  ) {
    return this.service.remove("kinerja", id, u);
  }
  @Menu("capaian_keuangan") @Delete("capaian/keuangan/:id") deleteF(
    @CurrentUser() u: Actor,
    @Param("id") id: string,
  ) {
    return this.service.remove("keuangan", id, u);
  }
  @Menu("dashboard") @Get("dashboard") dashboard(
    @CurrentUser() u: Actor,
    @Query() q: any,
  ) {
    return this.service.dashboard(u, filters.parse(q));
  }
  @Get("periode-status")
  periodeStatus(@CurrentUser() u: Actor, @Query("tahun") tahun?: string) {
    const year = tahun ? Number(tahun) : new Date().getFullYear();
    return this.service.periods(u, year);
  }
}
