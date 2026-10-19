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
import { CurrentUser } from "../auth/security";
import type { Actor } from "../common/policy";
import { MasterService } from "./master.service";
import { ThresholdService } from "./threshold.service";
@Controller()
export class MasterController {
  constructor(private service: MasterService, private thresholds: ThresholdService) {}
  @Get("master/threshold") thresholdsList(@CurrentUser() u: Actor) {
    return this.thresholds.list(u);
  }
  @Put("master/threshold") thresholdsSave(@CurrentUser() u: Actor, @Body() b: unknown) {
    return this.thresholds.save(u, b);
  }
  @Get("options") options(@CurrentUser() u: Actor) {
    return this.service.options(u);
  }
  @Get("master/bidang/simpeg") simpegBidang() {
    return this.service.getSimpegBidangList();
  }
  @Post("master/bidang/sync-simpeg") syncSimpegBidang(@CurrentUser() u: Actor) {
    return this.service.syncSimpegBidang(u);
  }
  @Get("master/kecamatan/egov") egovKecamatan() {
    return this.service.getEgovKecamatanList();
  }
  @Post("master/kecamatan/sync-egov") syncEgovKecamatan(
    @CurrentUser() u: Actor,
  ) {
    return this.service.syncEgovKecamatan(u);
  }
  @Get("master/faskes/simpeg") simpegFaskes() {
    return this.service.getSimpegFaskesList();
  }
  @Post("master/faskes/sync-simpeg") syncSimpegFaskes(
    @CurrentUser() u: Actor,
  ) {
    return this.service.syncSimpegFaskes(u);
  }
  @Get("master/:kind") list(
    @Param("kind") k: string,
    @CurrentUser() u: Actor,
    @Query() q: any,
  ) {
    return this.service.list(k, u, q);
  }
  @Post("master/:kind") create(
    @Param("kind") k: string,
    @CurrentUser() u: Actor,
    @Body() b: unknown,
  ) {
    return this.service.save(k, u, b);
  }
  @Put("master/:kind/:id") update(
    @Param("kind") k: string,
    @Param("id") id: string,
    @CurrentUser() u: Actor,
    @Body() b: unknown,
  ) {
    return this.service.save(k, u, b, id);
  }
  @Delete("master/:kind/:id") remove(
    @Param("kind") k: string,
    @Param("id") id: string,
    @CurrentUser() u: Actor,
  ) {
    return this.service.remove(k, u, id);
  }
}
