import express from "express";
import request from "supertest";
import { z } from "zod";
import { AppError } from "@/errors/AppError";
import { errorHandler } from "@/middleware/errorHandler";

function createErrorApp() {
  const app = express();

  app.get("/app-error", () => {
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  });

  app.get("/zod-error", (_req, _res, next) => {
    const parsed = z.object({ email: z.email() }).safeParse({ email: "bad" });
    if (!parsed.success) {
      return next(parsed.error);
    }
    return next();
  });

  app.get("/jwt-expired", (_req, _res, next) => {
    return next({ code: "ERR_JWT_EXPIRED" });
  });

  app.get("/generic-error", () => {
    throw new Error("Boom");
  });

  app.use(errorHandler);

  return app;
}

describe("errorHandler", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    consoleErrorSpy.mockRestore();
  });

  it("returns app errors with status and code", async () => {
    const response = await request(createErrorApp()).get("/app-error");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "Forbidden",
      code: "FORBIDDEN",
    });
  });

  it("returns validation errors from zod", async () => {
    const response = await request(createErrorApp()).get("/zod-error");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(response.body.issues).toBeDefined();
  });

  it("returns session expiry errors as unauthorized", async () => {
    const response = await request(createErrorApp()).get("/jwt-expired");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Session expired" });
  });

  it("hides internal error details in production", async () => {
    process.env.NODE_ENV = "production";

    const response = await request(createErrorApp()).get("/generic-error");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal server error" });
  });

  it("includes error details outside production", async () => {
    process.env.NODE_ENV = "test";

    const response = await request(createErrorApp()).get("/generic-error");

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Boom");
    expect(response.body.stack).toEqual(expect.any(String));
  });
});
