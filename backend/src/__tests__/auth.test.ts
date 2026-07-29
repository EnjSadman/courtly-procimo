jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("bcrypt", () => ({
  __esModule: true,
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

jest.mock("jose", () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue("mock-token"),
  })),
  decodeJwt: jest.fn().mockReturnValue({
    exp: Math.floor(Date.now() / 1000) + 60,
  }),
}));

import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { authRouter } from "@/routes/auth";
import { prisma } from "@/lib/prisma";

const mockedPrismaFindUnique = jest.mocked(prisma.user.findUnique);
const mockedPrismaCreate = jest.mocked(prisma.user.create);
const mockedBcryptCompare = bcrypt.compare as jest.Mock;
const mockedBcryptHash = bcrypt.hash as jest.Mock;
type FindUniqueUser = Awaited<ReturnType<typeof prisma.user.findUnique>>;
type CreatedUser = Awaited<ReturnType<typeof prisma.user.create>>;

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  return app;
}

describe("auth router", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockedPrismaFindUnique.mockReset();
    mockedPrismaCreate.mockReset();
    mockedBcryptCompare.mockReset();
    mockedBcryptHash.mockReset();
    process.env.NODE_ENV = originalNodeEnv;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("rejects invalid login payloads", async () => {
    const response = await request(createTestApp())
      .post("/auth/login")
      .send({ email: "bad-email", password: "" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Please enter a valid email address. Please enter your password.",
    );
    expect(response.body.errors).toEqual([
      "Please enter a valid email address.",
      "Please enter your password.",
    ]);
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

  it("returns an admin dashboard link after successful login", async () => {
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

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      redirect: "http://localhost:3000/admin/dashboard",
    });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("token=")]),
    );
  });

  it("rejects invalid registration payloads", async () => {
    const response = await request(createTestApp())
      .post("/auth/register")
      .send({ email: "bad-email", password: "short" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Please enter a valid email address. Password must be at least 8 characters long.",
    );
    expect(response.body.errors).toEqual([
      "Please enter a valid email address.",
      "Password must be at least 8 characters long.",
    ]);
    expect(response.body.issues).toBeDefined();
  });

  it("rejects duplicate registration emails", async () => {
    mockedPrismaFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
      role: Role.USER,
    } as FindUniqueUser);

    const response = await request(createTestApp())
      .post("/auth/register")
      .send({ email: "user@example.com", password: "password123" });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "An account with this email already exists.",
    });
    expect(mockedBcryptHash).not.toHaveBeenCalled();
    expect(mockedPrismaCreate).not.toHaveBeenCalled();
  });

  it("registers new users and returns a dashboard link", async () => {
    mockedPrismaFindUnique.mockResolvedValue(null);
    mockedBcryptHash.mockResolvedValue("hashed-password");
    mockedPrismaCreate.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      role: Role.USER,
    } as CreatedUser);

    const response = await request(createTestApp())
      .post("/auth/register")
      .send({ email: "user@example.com", password: "password123" });

    expect(response.status).toBe(200);
    expect(mockedBcryptHash).toHaveBeenCalledWith("password123", 10);
    expect(mockedPrismaCreate).toHaveBeenCalledWith({
      data: {
        email: "user@example.com",
        passwordHash: "hashed-password",
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
    expect(response.body).toEqual({
      redirect: "http://localhost:3000/dashboard",
    });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("token=")]),
    );
  });
});
