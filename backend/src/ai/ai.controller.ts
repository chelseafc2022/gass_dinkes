import { Body, Controller, Get, Header, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, Menu } from "../auth/security";
import type { Actor } from "../common/policy";
import { AiService } from "./ai.service";

@Controller("ai")
@Menu("dashboard")
export class AiController {
  constructor(private ai: AiService) {}
  @Get("status")
  @Header("Cache-Control", "no-store")
  status(@CurrentUser() actor: Actor) {
    return this.ai.availability(actor);
  }

  @Post("chat")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  chat(@CurrentUser() actor: Actor, @Body() body: unknown) {
    return this.ai.chat(actor, body);
  }

  @Post("facts")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  facts(@CurrentUser() actor: Actor, @Body() body: unknown) {
    return this.ai.facts(actor, body);
  }
}
