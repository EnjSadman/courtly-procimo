import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { Role } from "@prisma/client";
import { jwtSecret } from "@/config";
import { AppError } from "@/errors/AppError";
import { getCookieValue } from "@/lib/functions/misc/getCookieValue";

function isRole(value: unknown): value is Role {
  return value === Role.ADMIN || value === Role.USER;
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = getCookieValue(req.headers.cookie, "token");
    if (!token) {
      throw new AppError(401, "Unauthorized");
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(jwtSecret),
    );

    const id = typeof payload.id === "string" ? payload.id : null;
    const role = isRole(payload.role) ? payload.role : null;

    if (!id || !role) {
      throw new AppError(401, "Unauthorized");
    }

    req.authenticatedUser = {
      id,
      email: typeof payload.email === "string" ? payload.email : "",
      role,
    };

    return next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(new AppError(401, "Unauthorized"));
  }
}
