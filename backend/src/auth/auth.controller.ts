import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { AuthService } from "./auth.service";
import { CurrentUser, Public } from "./security";
import type { Actor } from "../common/policy";
@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}
  private cookies(
    res: Response,
    t: {
      accessToken: string;
      refreshToken: string;
      expiresAt: Date;
      user: unknown;
    },
  ) {
    const opts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/api",
    };
    res.cookie("gass_access", t.accessToken, {
      ...opts,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("gass_refresh", t.refreshToken, {
      ...opts,
      maxAge: Math.max(0, t.expiresAt.getTime() - Date.now()),
      path: "/api/auth",
    });
    return { user: t.user };
  }
  @Public()
  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const b = z
      .object({
        identifier: z.string().trim().min(1).max(100),
        password: z.string().min(1).max(200),
      })
      .strict()
      .parse(body);
    return this.cookies(res, await this.auth.login(b.identifier, b.password));
  }
  @Public() @Post("refresh") async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.cookies(
      res,
      await this.auth.refresh(req.cookies?.gass_refresh),
    );
  }
  @Public() @Post("logout") async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(req.cookies?.gass_refresh);
    res.clearCookie("gass_access", { path: "/api" });
    res.clearCookie("gass_refresh", { path: "/api/auth" });
    return { ok: true };
  }
  @Get("me") me(@CurrentUser() u: Actor) {
    return this.auth.me(u.id);
  }
}
