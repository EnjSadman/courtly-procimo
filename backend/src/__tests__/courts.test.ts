jest.mock("@/lib/prisma", () => ({
  prisma: {
    court: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sportType: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
}));

import express from "express";
import request from "supertest";
import { Prisma, Role } from "@prisma/client";
import { jwtVerify } from "jose";
import { courtsRouter } from "@/routes/courts";
import { errorHandler } from "@/middleware/errorHandler";
import { prisma } from "@/lib/prisma";

const mockedFindMany = jest.mocked(prisma.court.findMany);
const mockedFindUnique = jest.mocked(prisma.court.findUnique);
const mockedCreate = jest.mocked(prisma.court.create);
const mockedUpdate = jest.mocked(prisma.court.update);
const mockedSportTypeFindUnique = jest.mocked(prisma.sportType.findUnique);
const mockedJwtVerify = jwtVerify as jest.Mock;

const courtListQuery = {
  include: {
    sportType: {
      select: {
        name: true,
      },
    },
  },
} satisfies Prisma.CourtFindManyArgs;

type CourtListRow = Prisma.CourtGetPayload<typeof courtListQuery>;

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/courts", courtsRouter);
  app.use(errorHandler);
  return app;
}

const sampleCourts: CourtListRow[] = [
  {
    id: "aaaaaaaa-bbbb-4ccc-8ddd-000000000001",
    name: "Central Court",
    sportTypeId: "11111111-1111-4111-8111-111111111111",
    hourlyPrice: new Prisma.Decimal("40.00"),
    openTime: "08:00",
    closeTime: "22:00",
    timezone: "Europe/Kyiv",
    isActive: true,
    sportType: { name: "Tennis" },
  },
  {
    id: "aaaaaaaa-bbbb-4ccc-8ddd-000000000002",
    name: "Padel Arena",
    sportTypeId: "22222222-2222-4222-8222-222222222222",
    hourlyPrice: new Prisma.Decimal("32.50"),
    openTime: "09:00",
    closeTime: "23:00",
    timezone: "Europe/Kyiv",
    isActive: false,
    sportType: { name: "Padel" },
  },
];

const createPayload = {
  name: "New Court",
  sportTypeId: "11111111-1111-4111-8111-111111111111",
  hourlyPrice: 45,
  openTime: "08:00",
  closeTime: "21:00",
  timezone: "Europe/Kyiv",
};

describe("courts router", () => {
  beforeEach(() => {
    mockedFindMany.mockReset();
    mockedFindUnique.mockReset();
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    mockedSportTypeFindUnique.mockReset();
    mockedJwtVerify.mockReset();
  });

  it("rejects unauthenticated list requests", async () => {
    const response = await request(createTestApp()).get("/courts");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Unauthorized");
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("returns only active courts for regular users", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { id: "user-1", role: Role.USER },
    });
    mockedFindMany.mockResolvedValue([sampleCourts[0]!]);

    const response = await request(createTestApp())
      .get("/courts")
      .set("Cookie", "token=user-token");

    expect(response.status).toBe(200);
    expect(response.body.courts).toHaveLength(1);
    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
  });

  it("returns all courts for admin users", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { id: "admin-1", role: Role.ADMIN },
    });
    mockedFindMany.mockResolvedValue(sampleCourts);

    const response = await request(createTestApp())
      .get("/courts")
      .set("Cookie", "token=admin-token");

    expect(response.status).toBe(200);
    expect(response.body.courts).toHaveLength(2);
    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it("rejects create from non-admin users", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { id: "user-1", role: Role.USER },
    });

    const response = await request(createTestApp())
      .post("/courts")
      .set("Cookie", "token=user-token")
      .send(createPayload);

    expect(response.status).toBe(403);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("creates a court for admins", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { id: "admin-1", role: Role.ADMIN },
    });
    mockedSportTypeFindUnique.mockResolvedValue({
      id: createPayload.sportTypeId,
    } as Awaited<ReturnType<typeof prisma.sportType.findUnique>>);
    mockedCreate.mockResolvedValue({
      ...sampleCourts[0]!,
      id: "court-3",
      name: "New Court",
      hourlyPrice: new Prisma.Decimal("45.00"),
      openTime: "08:00",
      closeTime: "21:00",
      timezone: "Europe/Kyiv",
      isActive: true,
    });

    const response = await request(createTestApp())
      .post("/courts")
      .set("Cookie", "token=admin-token")
      .send(createPayload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: "court-3",
      name: "New Court",
      sportTypeId: sampleCourts[0]!.sportTypeId,
      sportType: "Tennis",
      hourlyPrice: "45.00",
      openTime: "08:00",
      closeTime: "21:00",
      timezone: "Europe/Kyiv",
      isActive: true,
    });
  });

  it("updates a court for admins", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { id: "admin-1", role: Role.ADMIN },
    });
    mockedFindUnique.mockResolvedValue({
      id: "aaaaaaaa-bbbb-4ccc-8ddd-000000000001",
      openTime: "08:00",
      closeTime: "22:00",
    } as Awaited<ReturnType<typeof prisma.court.findUnique>>);
    mockedUpdate.mockResolvedValue({
      ...sampleCourts[0]!,
      hourlyPrice: new Prisma.Decimal("50.00"),
      isActive: false,
    });

    const response = await request(createTestApp())
      .patch("/courts/aaaaaaaa-bbbb-4ccc-8ddd-000000000001")
      .set("Cookie", "token=admin-token")
      .send({ hourlyPrice: 50, isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.hourlyPrice).toBe("50.00");
    expect(response.body.isActive).toBe(false);
    expect(mockedUpdate).toHaveBeenCalled();
  });

  it("returns 404 when updating a missing court", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { id: "admin-1", role: Role.ADMIN },
    });
    mockedFindUnique.mockResolvedValue(null);

    const response = await request(createTestApp())
      .patch("/courts/cccccccc-dddd-4eee-8fff-000000000099")
      .set("Cookie", "token=admin-token")
      .send({ name: "Ghost" });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Court not found.");
  });
});
