jest.mock("@/lib/prisma", () => ({
  prisma: {
    sportType: {
      findMany: jest.fn(),
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
import { sportTypesRouter } from "@/routes/sportTypes";
import { errorHandler } from "@/middleware/errorHandler";
import { prisma } from "@/lib/prisma";

const mockedFindMany = jest.mocked(prisma.sportType.findMany);
const mockedJwtVerify = jwtVerify as jest.Mock;

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/sport-types", sportTypesRouter);
  app.use(errorHandler);
  return app;
}

describe("sport types router", () => {
  beforeEach(() => {
    mockedFindMany.mockReset();
    mockedJwtVerify.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    const response = await request(createTestApp()).get("/sport-types");

    expect(response.status).toBe(401);
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("returns sport types for authenticated users", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { id: "user-1", role: Role.USER },
    });
    mockedFindMany.mockResolvedValue([
      { id: "sport-1", name: "Tennis" },
      { id: "sport-2", name: "Padel" },
    ]);

    const response = await request(createTestApp())
      .get("/sport-types")
      .set("Cookie", "token=user-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      sportTypes: [
        { id: "sport-1", name: "Tennis" },
        { id: "sport-2", name: "Padel" },
      ],
    });
  });
});
