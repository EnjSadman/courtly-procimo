jest.mock("@/routes/auth", () => {
  const express = require("express");
  const router = express.Router();

  router.get("/mock-auth", (_req: unknown, res: { sendStatus: (code: number) => void }) => {
    res.sendStatus(204);
  });

  return { authRouter: router };
});

import request from "supertest";
import { app } from "@/app";

describe("app", () => {
  it("returns health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("mounts the auth router under /auth", async () => {
    const response = await request(app).get("/auth/mock-auth");

    expect(response.status).toBe(204);
  });

  it("applies helmet headers", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["x-dns-prefetch-control"]).toBe("off");
  });
});
