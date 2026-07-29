import { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "@/errors/AppError";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({ message: err.message, code: err.code });
  }

  if (err instanceof ZodError) {
    return res
      .status(400)
      .json({ message: "Validation failed", issues: err.issues });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Resource already exists" });
    }
    return res.status(400).json({ message: "Invalid request" });
  }

  if (err?.code === "ERR_JWT_EXPIRED") {
    return res.status(401).json({ message: "Session expired" });
  }

  const isProd = process.env.NODE_ENV === "production";
  return res.status(500).json({
    message: isProd ? "Internal server error" : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
};
