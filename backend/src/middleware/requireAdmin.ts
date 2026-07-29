import type { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { AppError } from "@/errors/AppError";

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.authenticatedUser?.role !== Role.ADMIN) {
    return next(new AppError(403, "Forbidden"));
  }

  return next();
}
