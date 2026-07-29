jest.mock("@/routes/auth", () => {
  const express = require("express");
  const router = express.Router();

  router.get("/mock-auth", (_req: unknown, res: { sendStatus: (code: number) => void }) => {
    res.sendStatus(204);
  });

  return { authRouter: router };
});

jest.mock("@/routes/profiles", () => {
  const express = require("express");
  const router = express.Router();

  router.get("/mock-profiles", (_req: unknown, res: { sendStatus: (code: number) => void }) => {
    res.sendStatus(204);
  });

  return { profilesRouter: router };
});

jest.mock("@/routes/courts", () => {
  const express = require("express");
  const router = express.Router();

  router.get("/mock-courts", (_req: unknown, res: { sendStatus: (code: number) => void }) => {
    res.sendStatus(204);
  });

  return { courtsRouter: router };
});

jest.mock("@/routes/sportTypes", () => {
  const express = require("express");
  const router = express.Router();

  router.get("/mock-sport-types", (_req: unknown, res: { sendStatus: (code: number) => void }) => {
    res.sendStatus(204);
  });

  return { sportTypesRouter: router };
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

  it("mounts the profiles router under /profiles", async () => {
    const response = await request(app).get("/profiles/mock-profiles");

    expect(response.status).toBe(204);
  });

  it("mounts the courts router under /courts", async () => {
    const response = await request(app).get("/courts/mock-courts");

    expect(response.status).toBe(204);
  });

  it("mounts the sport types router under /sport-types", async () => {
    const response = await request(app).get("/sport-types/mock-sport-types");

    expect(response.status).toBe(204);
  });

  it("applies helmet headers", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["x-dns-prefetch-control"]).toBe("off");
  });
});
