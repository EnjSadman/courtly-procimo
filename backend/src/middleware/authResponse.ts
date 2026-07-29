import { Request, Response, NextFunction } from "express";

import { jwtExpiration, jwtSecret } from "@/config";
import { Role } from "@prisma/client";
import { frontendUrl } from "@/config";
import { SignJWT } from "jose";

export async function authResponse(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const role = req.authenticatedUser?.role ?? Role.USER;
  const redirectPath = role === Role.ADMIN ? "/admin/dashboard" : "/dashboard";
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(jwtExpiration)
    .sign(new TextEncoder().encode(jwtSecret as string));
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + parseInt(jwtExpiration)),
    sameSite: "strict",
    path: "/",
  });
  return res.json({ redirect: `${frontendUrl}${redirectPath}` });
}
