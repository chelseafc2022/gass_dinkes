import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
  createParamDecorator,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { defaultPermission, hardPermission } from "../common/policy";
import { sessionExpiresAt } from "./auth.service";
export const Public = () => SetMetadata("public", true);
export const Menu = (menu: string) => SetMetadata("menu", menu);
export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwt: JwtService,
    private db: PrismaService,
  ) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const allowed = (
        process.env.FRONTEND_URL || "http://localhost:3000"
      ).split(",");
      if (
        req.headers["x-gass-client"] !== "web" ||
        (req.headers.origin && !allowed.includes(req.headers.origin))
      )
        throw new ForbiddenException("Asal permintaan tidak diizinkan.");
    }
    if (
      this.reflector.getAllAndOverride("public", [
        ctx.getHandler(),
        ctx.getClass(),
      ])
    )
      return true;
    try {
      const p = await this.jwt.verifyAsync(
        req.cookies?.gass_access ||
          req.headers.authorization?.replace(/^Bearer /, ""),
        {
          secret: process.env.JWT_ACCESS_SECRET,
          issuer: "gass",
          audience: "gass-web",
        },
      );
      if (p.type !== "access") throw new Error();
      const session = await this.db.session.findUnique({
        where: { id: p.sid },
        include: { user: true },
      });
      if (
        !session ||
        session.userId !== p.sub ||
        !session.user.isActive ||
        sessionExpiresAt(session) <= new Date()
      )
        throw new Error();
      req.user = session.user;
    } catch {
      throw new UnauthorizedException("Silakan masuk kembali.");
    }
    const menu = this.reflector.getAllAndOverride<string>("menu", [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (menu) {
      const permission = await this.db.menuPermission.findUnique({
        where: { role_menuKey: { role: req.user.role, menuKey: menu } },
      });
      if (
        !hardPermission(req.user.role, menu) ||
        !(permission?.canAccess ?? defaultPermission(req.user.role, menu))
      )
        throw new ForbiddenException("Anda tidak memiliki akses ke menu ini.");
    }
    return true;
  }
}
