jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("bcrypt", () => ({
  __esModule: true,
  default: {
    compare: jest.fn(),
  },
}));

import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { authRouter } from "@/routes/auth";
import { prisma } from "@/lib/prisma";

const mockedPrismaFindUnique = jest.mocked(prisma.user.findUnique);
const mockedBcryptCompare = bcrypt.compare as jest.Mock;

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  return app;
}

describe("auth router", () => {
  beforeEach(() => {
    mockedPrismaFindUnique.mockReset();
    mockedBcryptCompare.mockReset();
  });

  it("rejects invalid login payloads", async () => {
    const response = await request(createTestApp())
      .post("/auth/login")
      .send({ email: "bad-email", password: "" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid login payload.");
    expect(response.body.issues).toBeDefined();
  });

  it("rejects unknown users", async () => {
    mockedPrismaFindUnique.mockResolvedValue(null);

    const response = await request(createTestApp())
      .post("/auth/login")
      .send({ email: "user@example.com", password: "password123" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Invalid email or password." });
    expect(mockedBcryptCompare).not.toHaveBeenCalled();
  });

  it("rejects invalid passwords", async () => {
    mockedPrismaFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
      role: Role.USER,
    });
    mockedBcryptCompare.mockResolvedValue(false);

    const response = await request(createTestApp())
      .post("/auth/login")
      .send({ email: "user@example.com", password: "wrong-password" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Invalid email or password." });
  });

  it("redirects authenticated admins to the admin dashboard", async () => {
    mockedPrismaFindUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      passwordHash: "hashed-password",
      role: Role.ADMIN,
    });
    mockedBcryptCompare.mockResolvedValue(true);

    const response = await request(createTestApp())
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "correct-password" });

    expect(response.status).toBe(303);
    expect(response.headers.location).toBe(
      "http://localhost:3000/admin/dashboard",
    );
  });
});
