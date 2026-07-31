const mockDb = {
  court: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  booking: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  bookingSlot: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  $queryRawUnsafe: jest.fn().mockResolvedValue(undefined),
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    court: mockDb.court,
    booking: mockDb.booking,
    bookingSlot: mockDb.bookingSlot,
    $transaction: jest.fn((arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (tx: typeof mockDb) => unknown)(mockDb);
      }
      return Promise.all(arg as Array<Promise<unknown>>);
    }),
    $queryRawUnsafe: mockDb.$queryRawUnsafe,
  },
}));

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
}));

const mockedIsPast = jest.fn().mockReturnValue(false);
const mockedCanCancel = jest.fn().mockReturnValue(true);
const mockedZonedToUtc = jest
  .fn()
  .mockReturnValue(new Date("2026-07-15T10:00:00.000Z"));

jest.mock("@/lib/time", () => ({
  isPastZonedDateTime: (...args: unknown[]) => mockedIsPast(...args),
  canCancelStartsAt: (...args: unknown[]) => mockedCanCancel(...args),
  zonedDateTimeToUtc: (...args: unknown[]) => mockedZonedToUtc(...args),
  localDayRangeToUtc: jest.fn().mockReturnValue({
    start: new Date("2026-07-15T00:00:00.000Z"),
    end: new Date("2026-07-16T00:00:00.000Z"),
  }),
  localDateRangeToUtc: jest.fn().mockReturnValue({
    start: new Date("2026-07-15T00:00:00.000Z"),
    end: new Date("2026-07-16T00:00:00.000Z"),
  }),
}));

jest.mock("@/lib/rateLimit", () => ({
  createLimiter: jest.fn(
    () =>
      (
        _req: unknown,
        _res: unknown,
        next: () => void,
      ) =>
        next(),
  ),
  rateConfigs: {
    auth: { windowMs: 900000, max: 20 },
    availability: { windowMs: 60000, max: 120 },
    default: { windowMs: 300000, max: 100 },
  },
}));

import express from "express";
import request from "supertest";
import { BookingStatus, Prisma, Role } from "@prisma/client";
import { jwtVerify } from "jose";
import { bookingsRouter } from "@/routes/bookings";
import { errorHandler } from "@/middleware/errorHandler";

const mockedJwtVerify = jwtVerify as jest.Mock;
const mockedFindUniqueCourt = mockDb.court.findUnique as jest.Mock;
const mockedFindUniqueBooking = mockDb.booking.findUnique as jest.Mock;
const mockedFindManySlots = mockDb.bookingSlot.findMany as jest.Mock;
const mockedCreateBooking = mockDb.booking.create as jest.Mock;
const mockedUpdateBooking = mockDb.booking.update as jest.Mock;
const mockedDeleteManySlots = mockDb.bookingSlot.deleteMany as jest.Mock;

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/bookings", bookingsRouter);
  app.use(errorHandler);
  return app;
}

function authAs(role: Role, userId = "user-1") {
  mockedJwtVerify.mockResolvedValue({
    payload: { id: userId, email: `${userId}@test.local`, role },
  });
}

const sampleCourt = {
  id: "cccccccc-aaaa-4bbb-8ccc-dddddddddddd",
  hourlyPrice: new Prisma.Decimal("40.00"),
  openTime: "08:00",
  closeTime: "22:00",
  timezone: "UTC",
  isActive: true,
};

const createPayload = {
  courtId: sampleCourt.id,
  date: "2026-07-15",
  hours: ["10:00"],
};

const sampleBooking = {
  id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  userId: "user-1",
  courtId: sampleCourt.id,
  startsAt: new Date("2026-07-15T10:00:00.000Z"),
  duration: 1,
  price: new Prisma.Decimal("40.00"),
  status: BookingStatus.CONFIRMED,
  slots: [{ startsAt: new Date("2026-07-15T10:00:00.000Z") }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedIsPast.mockReturnValue(false);
  mockedCanCancel.mockReturnValue(true);
  mockedZonedToUtc.mockReturnValue(new Date("2026-07-15T10:00:00.000Z"));
});

describe("POST /bookings", () => {
  it("creates a booking for a valid 1-hour slot", async () => {
    authAs(Role.USER);
    mockedFindUniqueCourt.mockResolvedValue(sampleCourt);
    mockedFindManySlots.mockResolvedValue([]);
    mockedCreateBooking.mockResolvedValue(sampleBooking);

    const res = await request(createTestApp())
      .post("/bookings")
      .set("Cookie", "token=user-token")
      .send(createPayload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(sampleBooking.id);
    expect(res.body.duration).toBe(1);
    expect(res.body.price).toBe("40.00");
    expect(res.body.status).toBe("CONFIRMED");
    expect(res.body.slots).toHaveLength(1);
  });

  it("creates a booking for 2 consecutive hours", async () => {
    authAs(Role.USER);
    mockedFindUniqueCourt.mockResolvedValue(sampleCourt);
    mockedFindManySlots.mockResolvedValue([]);
    mockedCreateBooking.mockResolvedValue({
      ...sampleBooking,
      duration: 2,
      price: new Prisma.Decimal("80.00"),
      slots: [
        { startsAt: new Date("2026-07-15T10:00:00.000Z") },
        { startsAt: new Date("2026-07-15T11:00:00.000Z") },
      ],
    });

    const res = await request(createTestApp())
      .post("/bookings")
      .set("Cookie", "token=user-token")
      .send({ ...createPayload, hours: ["10:00", "11:00"] });

    expect(res.status).toBe(201);
    expect(res.body.duration).toBe(2);
    expect(res.body.price).toBe("80.00");
  });

  it("rejects non-consecutive hours", async () => {
    authAs(Role.USER);
    const res = await request(createTestApp())
      .post("/bookings")
      .set("Cookie", "token=user-token")
      .send({ ...createPayload, hours: ["10:00", "12:00"] });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Selected hours must be consecutive.");
  });

  it("rejects more than 2 hours", async () => {
    authAs(Role.USER);
    const res = await request(createTestApp())
      .post("/bookings")
      .set("Cookie", "token=user-token")
      .send({ ...createPayload, hours: ["10:00", "11:00", "12:00"] });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed");
    expect(res.body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("at most two"),
        }),
      ]),
    );
  });

  it("rejects zero hours", async () => {
    authAs(Role.USER);
    const res = await request(createTestApp())
      .post("/bookings")
      .set("Cookie", "token=user-token")
      .send({ ...createPayload, hours: [] });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed");
    expect(res.body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("at least one hour"),
        }),
      ]),
    );
  });

  it("rejects booking on inactive court", async () => {
    authAs(Role.USER);
    mockedFindUniqueCourt.mockResolvedValue({
      ...sampleCourt,
      isActive: false,
    });

    const res = await request(createTestApp())
      .post("/bookings")
      .set("Cookie", "token=user-token")
      .send(createPayload);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Court not found.");
  });

  it("rejects booking for non-existent court", async () => {
    authAs(Role.USER);
    mockedFindUniqueCourt.mockResolvedValue(null);

    const res = await request(createTestApp())
      .post("/bookings")
      .set("Cookie", "token=user-token")
      .send(createPayload);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Court not found.");
  });

  it("rejects booking when slots are outside opening hours", async () => {
    authAs(Role.USER);
    mockedFindUniqueCourt.mockResolvedValue(sampleCourt);

    const res = await request(createTestApp())
      .post("/bookings")
      .set("Cookie", "token=user-token")
      .send({ ...createPayload, hours: ["07:00"] });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Selected hours are outside court opening hours.",
    );
  });

  it("rejects booking when hour equals closeTime", async () => {
    authAs(Role.USER);
    mockedFindUniqueCourt.mockResolvedValue(sampleCourt);

    const res = await request(createTestApp())
      .post("/bookings")
      .set("Cookie", "token=user-token")
      .send({ ...createPayload, hours: ["22:00"] });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Selected hours are outside court opening hours.",
    );
  });

  it("rejects booking in the past", async () => {
    authAs(Role.USER);
    mockedFindUniqueCourt.mockResolvedValue(sampleCourt);
    mockedIsPast.mockReturnValue(true);

    const res = await request(createTestApp())
      .post("/bookings")
      .set("Cookie", "token=user-token")
      .send(createPayload);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cannot book a past time slot.");
  });

  it("prevents double booking when slots are already taken", async () => {
    authAs(Role.USER, "user-2");
    mockedFindUniqueCourt.mockResolvedValue(sampleCourt);
    mockedFindManySlots.mockResolvedValue([{ id: "existing-slot" }]);

    const res = await request(createTestApp())
      .post("/bookings")
      .set("Cookie", "token=user-2-token")
      .send(createPayload);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe(
      "One or more selected slots are already booked.",
    );
  });

  it("prevents double booking via unique constraint violation (P2002)", async () => {
    authAs(Role.USER, "user-2");
    mockedFindUniqueCourt.mockResolvedValue(sampleCourt);
    mockedFindManySlots.mockResolvedValue([]);
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "6.0.0",
        meta: { target: ["courtId", "startsAt"] },
      },
    );
    mockedCreateBooking.mockRejectedValue(p2002Error);

    const res = await request(createTestApp())
      .post("/bookings")
      .set("Cookie", "token=user-2-token")
      .send(createPayload);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe(
      "One or more selected slots are already booked.",
    );
  });

  it("rejects unauthenticated requests", async () => {
    mockedJwtVerify.mockRejectedValue(new Error("no token"));

    const res = await request(createTestApp())
      .post("/bookings")
      .send(createPayload);

    expect(res.status).toBe(401);
  });
});

describe("POST /bookings/:bookingId/cancel", () => {
  const cancelPath = `/bookings/${sampleBooking.id}/cancel`;

  it("cancels a booking more than 2 hours before start", async () => {
    authAs(Role.USER);
    mockedFindUniqueBooking.mockResolvedValue({
      id: sampleBooking.id,
      userId: "user-1",
      startsAt: sampleBooking.startsAt,
      status: BookingStatus.CONFIRMED,
    });
    mockedCanCancel.mockReturnValue(true);

    const res = await request(createTestApp())
      .post(cancelPath)
      .set("Cookie", "token=user-token");

    expect(res.status).toBe(204);
    expect(mockedDeleteManySlots).toHaveBeenCalledWith({
      where: { bookingId: sampleBooking.id },
    });
    expect(mockedUpdateBooking).toHaveBeenCalledWith({
      where: { id: sampleBooking.id },
      data: { status: BookingStatus.CANCELLED },
    });
  });

  it("rejects cancellation less than 2 hours before start", async () => {
    authAs(Role.USER);
    mockedFindUniqueBooking.mockResolvedValue({
      id: sampleBooking.id,
      userId: "user-1",
      startsAt: sampleBooking.startsAt,
      status: BookingStatus.CONFIRMED,
    });
    mockedCanCancel.mockReturnValue(false);

    const res = await request(createTestApp())
      .post(cancelPath)
      .set("Cookie", "token=user-token");

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("2 hours before");
    expect(mockedDeleteManySlots).not.toHaveBeenCalled();
  });

  it("rejects cancellation of already cancelled booking", async () => {
    authAs(Role.USER);
    mockedFindUniqueBooking.mockResolvedValue({
      id: sampleBooking.id,
      userId: "user-1",
      startsAt: sampleBooking.startsAt,
      status: BookingStatus.CANCELLED,
    });

    const res = await request(createTestApp())
      .post(cancelPath)
      .set("Cookie", "token=user-token");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Booking is not active.");
  });

  it("rejects cancellation of another user's booking", async () => {
    authAs(Role.USER, "user-2");
    mockedFindUniqueBooking.mockResolvedValue({
      id: sampleBooking.id,
      userId: "user-1",
      startsAt: sampleBooking.startsAt,
      status: BookingStatus.CONFIRMED,
    });

    const res = await request(createTestApp())
      .post(cancelPath)
      .set("Cookie", "token=user-2-token");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Booking not found.");
  });

  it("rejects cancellation of non-existent booking", async () => {
    authAs(Role.USER);
    mockedFindUniqueBooking.mockResolvedValue(null);

    const res = await request(createTestApp())
      .post(`/bookings/ffffffff-ffff-4fff-8fff-ffffffffffff/cancel`)
      .set("Cookie", "token=user-token");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Booking not found.");
  });
});

describe("POST /bookings/search", () => {
  it("returns occupied and mine slots for a date", async () => {
    authAs(Role.USER);
    mockDb.court.findMany.mockResolvedValue([
      { id: sampleCourt.id, timezone: "UTC" },
    ]);
    mockDb.booking.findMany.mockResolvedValue([
      {
        id: "booking-1",
        userId: "user-1",
        courtId: sampleCourt.id,
        startsAt: new Date("2026-07-15T10:00:00.000Z"),
        slots: [{ startsAt: new Date("2026-07-15T10:00:00.000Z") }],
      },
      {
        id: "booking-2",
        userId: "user-2",
        courtId: sampleCourt.id,
        startsAt: new Date("2026-07-15T11:00:00.000Z"),
        slots: [{ startsAt: new Date("2026-07-15T11:00:00.000Z") }],
      },
    ]);

    const res = await request(createTestApp())
      .post("/bookings/search")
      .set("Cookie", "token=user-token")
      .send({ date: "2026-07-15" });

    expect(res.status).toBe(200);
    expect(res.body.mine).toHaveLength(1);
    expect(res.body.mine[0].bookingId).toBe("booking-1");
    expect(res.body.occupied).toHaveLength(1);
    expect(res.body.occupied[0].courtId).toBe(sampleCourt.id);
  });

  it("returns empty arrays when no courts match", async () => {
    authAs(Role.USER);
    mockDb.court.findMany.mockResolvedValue([]);

    const res = await request(createTestApp())
      .post("/bookings/search")
      .set("Cookie", "token=user-token")
      .send({ date: "2026-07-15" });

    expect(res.status).toBe(200);
    expect(res.body.occupied).toEqual([]);
    expect(res.body.mine).toEqual([]);
  });
});

describe("GET /bookings/daily", () => {
  it("returns daily bookings with revenue for admin", async () => {
    authAs(Role.ADMIN);
    mockDb.court.findMany.mockResolvedValue([
      { id: sampleCourt.id, timezone: "UTC" },
    ]);
    mockDb.bookingSlot.findMany.mockResolvedValue([
      {
        bookingId: "booking-1",
        booking: {
          id: "booking-1",
          userId: "user-1",
          courtId: sampleCourt.id,
          startsAt: new Date("2026-07-15T10:00:00.000Z"),
          duration: 1,
          price: new Prisma.Decimal("40.00"),
          status: BookingStatus.CONFIRMED,
          user: { id: "user-1", email: "user@test.local" },
          court: {
            id: sampleCourt.id,
            name: "Central Court",
            sportType: { name: "Tennis" },
          },
          slots: [{ startsAt: new Date("2026-07-15T10:00:00.000Z") }],
        },
      },
      {
        bookingId: "booking-2",
        booking: {
          id: "booking-2",
          userId: "user-1",
          courtId: sampleCourt.id,
          startsAt: new Date("2026-07-15T11:00:00.000Z"),
          duration: 1,
          price: new Prisma.Decimal("40.00"),
          status: BookingStatus.CANCELLED,
          user: { id: "user-1", email: "user@test.local" },
          court: {
            id: sampleCourt.id,
            name: "Central Court",
            sportType: { name: "Tennis" },
          },
          slots: [{ startsAt: new Date("2026-07-15T11:00:00.000Z") }],
        },
      },
    ]);

    const res = await request(createTestApp())
      .get("/bookings/daily?date=2026-07-15")
      .set("Cookie", "token=admin-token");

    expect(res.status).toBe(200);
    expect(res.body.date).toBe("2026-07-15");
    expect(res.body.bookings).toHaveLength(2);
    expect(res.body.totalRevenue).toBe("40.00");
    expect(res.body.confirmedBookings).toBe(1);
    expect(res.body.cancelledBookings).toBe(1);
    expect(res.body.totalBookings).toBe(2);
  });

  it("rejects non-admin users", async () => {
    authAs(Role.USER);

    const res = await request(createTestApp())
      .get("/bookings/daily?date=2026-07-15")
      .set("Cookie", "token=user-token");

    expect(res.status).toBe(403);
  });

  it("rejects missing date parameter", async () => {
    authAs(Role.ADMIN);

    const res = await request(createTestApp())
      .get("/bookings/daily")
      .set("Cookie", "token=admin-token");

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("YYYY-MM-DD");
  });
});

describe("GET /bookings/mine", () => {
  it("returns the authenticated user's bookings sorted by date", async () => {
    authAs(Role.USER);
    mockDb.booking.findMany.mockResolvedValue([
      {
        id: "booking-1",
        userId: "user-1",
        courtId: sampleCourt.id,
        startsAt: new Date("2026-07-15T10:00:00.000Z"),
        duration: 1,
        price: new Prisma.Decimal("40.00"),
        status: BookingStatus.CONFIRMED,
        createdAt: new Date("2026-07-10T00:00:00.000Z"),
        court: {
          id: sampleCourt.id,
          name: "Central Court",
          sportType: { name: "Tennis" },
        },
        slots: [{ startsAt: new Date("2026-07-15T10:00:00.000Z") }],
      },
      {
        id: "booking-2",
        userId: "user-1",
        courtId: sampleCourt.id,
        startsAt: new Date("2026-07-14T08:00:00.000Z"),
        duration: 2,
        price: new Prisma.Decimal("80.00"),
        status: BookingStatus.CANCELLED,
        createdAt: new Date("2026-07-09T00:00:00.000Z"),
        court: {
          id: sampleCourt.id,
          name: "Central Court",
          sportType: { name: "Tennis" },
        },
        slots: [
          { startsAt: new Date("2026-07-14T08:00:00.000Z") },
          { startsAt: new Date("2026-07-14T09:00:00.000Z") },
        ],
      },
    ]);

    const res = await request(createTestApp())
      .get("/bookings/mine")
      .set("Cookie", "token=user-token");

    expect(res.status).toBe(200);
    expect(res.body.bookings).toHaveLength(2);
    expect(res.body.bookings[0].id).toBe("booking-1");
    expect(res.body.bookings[0].courtName).toBe("Central Court");
    expect(res.body.bookings[0].sportType).toBe("Tennis");
    expect(res.body.bookings[1].status).toBe("CANCELLED");
    expect(res.body.bookings[1].duration).toBe(2);
  });

  it("returns empty array when user has no bookings", async () => {
    authAs(Role.USER, "new-user");
    mockDb.booking.findMany.mockResolvedValue([]);

    const res = await request(createTestApp())
      .get("/bookings/mine")
      .set("Cookie", "token=new-user-token");

    expect(res.status).toBe(200);
    expect(res.body.bookings).toEqual([]);
  });
});
