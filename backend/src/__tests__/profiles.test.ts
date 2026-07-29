jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
}));

import express from "express";
import request from "supertest";
import { Role } from "@prisma/client";
import { jwtVerify } from "jose";
import { profilesRouter } from "@/routes/profiles";
import { errorHandler } from "@/middleware/errorHandler";
import { prisma } from "@/lib/prisma";

const mockedFindUnique = jest.mocked(prisma.user.findUnique);
const mockedJwtVerify = jwtVerify as jest.Mock;
type FindUniqueUser = Awaited<ReturnType<typeof prisma.user.findUnique>>;

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/profiles", profilesRouter);
  app.use(errorHandler);
  return app;
}

describe("profiles router", () => {
  beforeEach(() => {
    mockedFindUnique.mockReset();
    mockedJwtVerify.mockReset();
  });

  it("returns the authenticated profile from /profiles/me", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: {
        id: "admin-1",
        email: "admin@example.com",
        role: Role.ADMIN,
      },
    });

    const response = await request(createTestApp())
      .get("/profiles/me")
      .set("Cookie", "token=admin-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "admin-1",
      email: "admin@example.com",
      role: Role.ADMIN,
    });
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it("loads email from the database when the token omits it", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: {
        id: "admin-1",
        role: Role.ADMIN,
      },
    });
    mockedFindUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      role: Role.ADMIN,
    } as FindUniqueUser);

    const response = await request(createTestApp())
      .get("/profiles/me")
      .set("Cookie", "token=admin-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "admin-1",
      email: "admin@example.com",
      role: Role.ADMIN,
    });
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
  });

  it("rejects unauthenticated profile lookups", async () => {
    const response = await request(createTestApp()).get("/profiles/user-2");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Unauthorized");
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it("rejects non-admin profile lookups by id", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: {
        id: "user-1",
        email: "user@example.com",
        role: Role.USER,
      },
    });

    const response = await request(createTestApp())
      .get("/profiles/user-2")
      .set("Cookie", "token=user-token");

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it("returns a profile by id for admins", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: {
        id: "admin-1",
        email: "admin@example.com",
        role: Role.ADMIN,
      },
    });
    mockedFindUnique.mockResolvedValue({
      id: "user-2",
      email: "user@example.com",
      role: Role.USER,
    } as FindUniqueUser);

    const response = await request(createTestApp())
      .get("/profiles/user-2")
      .set("Cookie", "token=admin-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "user-2",
      email: "user@example.com",
      role: Role.USER,
    });
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { id: "user-2" },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
  });

  it("returns 404 when the profile does not exist", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: {
        id: "admin-1",
        email: "admin@example.com",
        role: Role.ADMIN,
      },
    });
    mockedFindUnique.mockResolvedValue(null);

    const response = await request(createTestApp())
      .get("/profiles/missing-user")
      .set("Cookie", "token=admin-token");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Profile not found.");
  });
});
