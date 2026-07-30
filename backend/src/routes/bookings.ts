import { Router, type Request, type Response, type NextFunction } from "express";
import { BookingStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireAuth";
import { AppError } from "@/errors/AppError";

const router = Router();

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const occupiedQuerySchema = z
  .object({
    date: z.string().regex(datePattern, "date must use YYYY-MM-DD format.").optional(),
    from: z.string().regex(datePattern, "from must use YYYY-MM-DD format.").optional(),
    to: z.string().regex(datePattern, "to must use YYYY-MM-DD format.").optional(),
    courtIds: z.string().optional(),
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

function parseDateOnlyUtc(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new AppError(400, "Date must use YYYY-MM-DD format.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function listOccupiedSlots(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = occupiedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw parsed.error;
    }

    const fromValue = parsed.data.date ?? parsed.data.from;
    const toValue = parsed.data.date ?? parsed.data.to;

    if (!fromValue || !toValue) {
      throw new AppError(400, "Provide date, or both from and to.");
    }

    const fromDate = parseDateOnlyUtc(fromValue);
    const toDate = parseDateOnlyUtc(toValue);

    if (fromDate > toDate) {
      throw new AppError(400, "from must be on or before to.");
    }

    const rangeEndExclusive = addUtcDays(toDate, 1);
    const courtIds = parsed.data.courtIds
      ? parsed.data.courtIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : [];

    const bookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        ...(courtIds.length > 0 ? { courtId: { in: courtIds } } : {}),
        slots: {
          some: {
            startsAt: {
              gte: fromDate,
              lt: rangeEndExclusive,
            },
          },
        },
      },
      select: {
        courtId: true,
        slots: {
          where: {
            startsAt: {
              gte: fromDate,
              lt: rangeEndExclusive,
            },
          },
          select: {
            startsAt: true,
          },
          orderBy: [{ startsAt: "asc" }],
        },
      },
    });

    const occupied = bookings.flatMap((booking) =>
      booking.slots.map((slot) => ({
        courtId: booking.courtId,
        startsAt: slot.startsAt.toISOString(),
      })),
    );

    occupied.sort((left, right) => left.startsAt.localeCompare(right.startsAt));

    return res.json({ occupied });
  } catch (error) {
    return next(error);
  }
}

router.get("/occupied", requireAuth, listOccupiedSlots);

export const bookingsRouter = router;
