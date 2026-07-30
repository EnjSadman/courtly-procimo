import { Router, type Request, type Response, type NextFunction } from "express";
import { BookingStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireAuth";
import { AppError } from "@/errors/AppError";
import {
  isPastZonedDateTime,
  localDateRangeToUtc,
  canCancelStartsAt,
  zonedDateTimeToUtc,
} from "@/lib/time";

const router = Router();

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const occupiedBodySchema = z
  .object({
    date: z
      .string()
      .regex(datePattern, "date must use YYYY-MM-DD format.")
      .optional(),
    from: z
      .string()
      .regex(datePattern, "from must use YYYY-MM-DD format.")
      .optional(),
    to: z
      .string()
      .regex(datePattern, "to must use YYYY-MM-DD format.")
      .optional(),
    courtIds: z.array(z.uuid("Each court id must be a valid UUID.")).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.date) {
      return;
    }

    if (!value.from || !value.to) {
      ctx.addIssue({
        code: "custom",
        message: "Provide date, or both from and to.",
      });
    }
  });

const createBookingSchema = z.object({
  courtId: z.uuid("Court id must be a valid UUID."),
  date: z.string().regex(datePattern, "date must use YYYY-MM-DD format."),
  hours: z
    .array(z.string().regex(timePattern, "Hours must use HH:MM format."))
    .min(1, "Select at least one hour.")
    .max(2, "You can book at most two consecutive hours."),
});

function assertConsecutiveHours(hours: string[]) {
  const sorted = [...hours].sort((left, right) => left.localeCompare(right));
  if (sorted.length === 2) {
    const first = Number(sorted[0]!.slice(0, 2));
    const second = Number(sorted[1]!.slice(0, 2));
    if (second - first !== 1) {
      throw new AppError(400, "Selected hours must be consecutive.");
    }
  }
  return sorted;
}

async function listOccupiedSlots(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = occupiedBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const fromValue = parsed.data.date ?? parsed.data.from;
    const toValue = parsed.data.date ?? parsed.data.to;

    if (!fromValue || !toValue) {
      throw new AppError(400, "Provide date, or both from and to.");
    }

    if (fromValue > toValue) {
      throw new AppError(400, "from must be on or before to.");
    }

    const userId = req.authenticatedUser?.id;
    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }

    const courtIds = parsed.data.courtIds ?? [];
    const courts = await prisma.court.findMany({
      ...(courtIds.length > 0 ? { where: { id: { in: courtIds } } } : {}),
      select: {
        id: true,
        timezone: true,
      },
    });

    if (courts.length === 0) {
      return res.json({ occupied: [], mine: [] });
    }

    const slotFilters = courts.map((court) => {
      const { start, end } = localDateRangeToUtc(
        fromValue,
        toValue,
        court.timezone,
      );

      return {
        courtId: court.id,
        startsAt: {
          gte: start,
          lt: end,
        },
      };
    });

    const bookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        slots: {
          some: {
            OR: slotFilters,
          },
        },
      },
      select: {
        id: true,
        userId: true,
        courtId: true,
        startsAt: true,
        slots: {
          where: {
            OR: slotFilters,
          },
          select: {
            startsAt: true,
          },
          orderBy: [{ startsAt: "asc" }],
        },
      },
    });

    const occupied: { courtId: string; startsAt: string }[] = [];
    const mine: {
      courtId: string;
      startsAt: string;
      bookingId: string;
      bookingStartsAt: string;
    }[] = [];

    for (const booking of bookings) {
      for (const slot of booking.slots) {
        if (booking.userId === userId) {
          mine.push({
            courtId: booking.courtId,
            startsAt: slot.startsAt.toISOString(),
            bookingId: booking.id,
            bookingStartsAt: booking.startsAt.toISOString(),
          });
        } else {
          occupied.push({
            courtId: booking.courtId,
            startsAt: slot.startsAt.toISOString(),
          });
        }
      }
    }

    occupied.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
    mine.sort((left, right) => left.startsAt.localeCompare(right.startsAt));

    return res.json({ occupied, mine });
  } catch (error) {
    return next(error);
  }
}

async function createBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authenticatedUser?.id;
    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }

    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const hours = assertConsecutiveHours(parsed.data.hours);
    const { courtId, date } = parsed.data;

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      select: {
        id: true,
        hourlyPrice: true,
        openTime: true,
        closeTime: true,
        timezone: true,
        isActive: true,
      },
    });

    if (!court || !court.isActive) {
      throw new AppError(404, "Court not found.");
    }

    for (const hour of hours) {
      const slotMinutes =
        Number(hour.slice(0, 2)) * 60 + Number(hour.slice(3, 5));
      const openMinutes =
        Number(court.openTime.slice(0, 2)) * 60 +
        Number(court.openTime.slice(3, 5));
      const closeMinutes =
        Number(court.closeTime.slice(0, 2)) * 60 +
        Number(court.closeTime.slice(3, 5));

      if (slotMinutes < openMinutes || slotMinutes >= closeMinutes) {
        throw new AppError(400, "Selected hours are outside court opening hours.");
      }
      if (isPastZonedDateTime(date, hour, court.timezone)) {
        throw new AppError(400, "Cannot book a past time slot.");
      }
    }

    const startsAt = zonedDateTimeToUtc(date, hours[0]!, court.timezone);
    const slotStarts = hours.map((hour) =>
      zonedDateTimeToUtc(date, hour, court.timezone),
    );
    const duration = hours.length;
    const price = new Prisma.Decimal(court.hourlyPrice).mul(duration);

    try {
      const booking = await prisma.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          `SELECT id FROM "Court" WHERE id = $1 FOR UPDATE`,
          courtId,
        );

        const conflicts = await tx.bookingSlot.findMany({
          where: {
            courtId,
            startsAt: { in: slotStarts },
          },
          select: { id: true },
        });

        if (conflicts.length > 0) {
          throw new AppError(409, "One or more selected slots are already booked.");
        }

        return tx.booking.create({
          data: {
            userId,
            courtId,
            startsAt,
            duration,
            price,
            status: BookingStatus.CONFIRMED,
            slots: {
              create: slotStarts.map((slotStartsAt) => ({
                courtId,
                startsAt: slotStartsAt,
              })),
            },
          },
          select: {
            id: true,
            courtId: true,
            startsAt: true,
            duration: true,
            price: true,
            status: true,
            slots: {
              select: {
                startsAt: true,
              },
              orderBy: [{ startsAt: "asc" }],
            },
          },
        });
      });

      return res.status(201).json({
        id: booking.id,
        courtId: booking.courtId,
        startsAt: booking.startsAt.toISOString(),
        duration: booking.duration,
        price: booking.price.toFixed(2),
        status: booking.status,
        slots: booking.slots.map((slot) => slot.startsAt.toISOString()),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(409, "One or more selected slots are already booked.");
      }
      throw error;
    }
  } catch (error) {
    return next(error);
  }
}

async function cancelBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authenticatedUser?.id;
    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }

    const bookingId = req.params.bookingId;
    if (typeof bookingId !== "string" || bookingId.length === 0) {
      throw new AppError(400, "Booking id is required.");
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        startsAt: true,
        status: true,
      },
    });

    if (!booking || booking.userId !== userId) {
      throw new AppError(404, "Booking not found.");
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new AppError(400, "Booking is not active.");
    }

    if (!canCancelStartsAt(booking.startsAt)) {
      throw new AppError(
        400,
        "Bookings can only be cancelled more than 2 hours before the start time.",
      );
    }

    await prisma.$transaction([
      prisma.bookingSlot.deleteMany({
        where: { bookingId: booking.id },
      }),
      prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED },
      }),
    ]);

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

router.post("/search", requireAuth, listOccupiedSlots);
router.post("/", requireAuth, createBooking);
router.post("/:bookingId/cancel", requireAuth, cancelBooking);

export const bookingsRouter = router;
