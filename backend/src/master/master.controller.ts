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
@Controller()
export class MasterController {
  constructor(private service: MasterService) {}
  @Get("options") options(@CurrentUser() u: Actor) {
    return this.service.options(u);
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
