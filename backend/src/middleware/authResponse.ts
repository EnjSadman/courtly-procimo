import { Request, Response, NextFunction } from "express";

import { jwtExpiration, jwtSecret } from "@/config";
import { Role } from "@prisma/client";
import { frontendUrl } from "@/config";
import { SignJWT, decodeJwt } from "jose";

export async function authResponse(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { role, id } = req.authenticatedUser ?? { role: Role.USER, id: null };
  if (!id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const redirectPath = role === Role.ADMIN ? "/admin/dashboard" : "/dashboard";
  try {
    const token = await new SignJWT({ role, id })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(jwtExpiration)
      .sign(new TextEncoder().encode(jwtSecret as string));

    const decoded = decodeJwt(token);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: decoded.exp ? new Date(decoded.exp * 1000) : undefined,
      sameSite: "strict",
      path: "/",
    });
    return res.json({ redirect: `${frontendUrl}${redirectPath}` });
  } catch (error) {
    next(error);
  }
}
