import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EgovService } from "./egov.service";
import { defaultPermission, hardPermission, MENUS } from "../common/policy";
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
@Injectable()
export class AuthService {
  constructor(
    private db: PrismaService,
    private jwt: JwtService,
    private egov: EgovService,
  ) {}
  async login(identifier: string, password: string) {
    const profile = await this.egov.authenticate(identifier, password);
    const user = await this.db.user.findUnique({
      where: { nip: String(profile.nip) },
    });
    if (!user?.isActive)
      throw new ForbiddenException(
        "Akun eGov valid, tetapi akses GASS belum diberikan atau tidak aktif. Hubungi Admin Dinkes.",
      );
    if (
      (user.role === "OPERATOR_PUSKESMAS" && !user.faskesId) ||
      (user.role === "AKUN_BIDANG" && !user.bidangId)
    )
      throw new ForbiddenException("Penugasan faskes/bidang belum lengkap.");
    await this.db.user.update({
      where: { id: user.id },
      data: {
        name: String(profile.name),
        jabatan: String(profile.jabatan),
        egovId: profile.egovId,
      },
    });
    const refreshToken = randomBytes(48).toString("base64url");
    const session = await this.db.session.create({
      data: {
        userId: user.id,
        tokenHash: hash(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    return this.tokens(user.id, session.id, refreshToken);
  }
  async refresh(token?: string) {
    if (!token) throw new UnauthorizedException("Sesi telah berakhir.");
    const tokenHash = hash(token),
      next = randomBytes(48).toString("base64url");
    const session = await this.db.$transaction(async (tx) => {
      const s = await tx.session.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
      if (!s || s.expiresAt <= new Date() || !s.user.isActive)
        throw new UnauthorizedException("Sesi telah berakhir.");
      const changed = await tx.session.updateMany({
        where: { id: s.id, tokenHash },
        data: { tokenHash: hash(next) },
      });
      if (changed.count !== 1)
        throw new UnauthorizedException("Token sudah digunakan.");
      return s;
    });
    return this.tokens(session.userId, session.id, next);
  }
  private async tokens(userId: string, sid: string, refreshToken: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, sid, type: "access" },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: "15m",
        issuer: "gass",
        audience: "gass-web",
      },
    );
    return { accessToken, refreshToken, user: await this.me(userId) };
  }
  async me(id: string) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id },
      include: { faskes: true, bidang: true },
    });
    const permissions = await this.db.menuPermission.findMany({
      where: { role: user.role },
    });
    return {
      ...user,
      permissions: MENUS.filter(
        (menu) =>
          hardPermission(user.role, menu) &&
          (permissions.find((p) => p.menuKey === menu)?.canAccess ??
            defaultPermission(user.role, menu)),
      ),
    };
  }
  async logout(token?: string) {
    if (token)
      await this.db.session.deleteMany({ where: { tokenHash: hash(token) } });
    return { ok: true };
  }
}
