import { Router, type Request, type Response, type NextFunction } from "express";
import { Role, type Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireAuth";
import { requireAdmin } from "@/middleware/requireAdmin";
import { AppError } from "@/errors/AppError";

const router = Router();

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const courtInclude = {
  sportType: {
    select: {
      name: true,
    },
  },
} as const;

const createCourtSchema = z.object({
  name: z.string().trim().min(1, "Court name is required."),
  sportTypeId: z.uuid("Please select a valid sport type."),
  hourlyPrice: z.coerce
    .number()
    .positive("Hourly price must be greater than zero."),
  openTime: z
    .string()
    .regex(timePattern, "Opening time must use HH:MM format."),
  closeTime: z
    .string()
    .regex(timePattern, "Closing time must use HH:MM format."),
  isActive: z.boolean().optional().default(true),
});

const updateCourtSchema = createCourtSchema.partial();

function serializeCourt(
  court: {
    id: string;
    name: string;
    sportTypeId: string;
    hourlyPrice: { toFixed: (digits: number) => string };
    openTime: string;
    closeTime: string;
    isActive: boolean;
    sportType: { name: string };
  },
) {
  return {
    id: court.id,
    name: court.name,
    sportTypeId: court.sportTypeId,
    sportType: court.sportType.name,
    hourlyPrice: court.hourlyPrice.toFixed(2),
    openTime: court.openTime,
    closeTime: court.closeTime,
    isActive: court.isActive,
  };
}

function assertValidHours(openTime: string, closeTime: string) {
  if (openTime >= closeTime) {
    throw new AppError(400, "Opening time must be before closing time.");
  }
}

function getCourtIdParam(req: Request) {
  const courtId = req.params.courtId;
  if (typeof courtId !== "string" || courtId.length === 0) {
    throw new AppError(400, "Court id is required.");
  }
  if (!uuidPattern.test(courtId)) {
    throw new AppError(404, "Court not found.");
  }
  return courtId;
}

async function listCourts(req: Request, res: Response, next: NextFunction) {
  try {
    const isAdmin = req.authenticatedUser?.role === Role.ADMIN;
    const where: Prisma.CourtWhereInput = isAdmin ? {} : { isActive: true };

    const courts = await prisma.court.findMany({
      where,
      orderBy: [{ name: "asc" }],
      include: courtInclude,
    });

    return res.json({
      courts: courts.map(serializeCourt),
    });
  } catch (error) {
    return next(error);
  }
}

async function getCourt(req: Request, res: Response, next: NextFunction) {
  try {
    const courtId = getCourtIdParam(req);
    const isAdmin = req.authenticatedUser?.role === Role.ADMIN;

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: courtInclude,
    });

    if (!court || (!isAdmin && !court.isActive)) {
      throw new AppError(404, "Court not found.");
    }

    return res.json(serializeCourt(court));
  } catch (error) {
    return next(error);
  }
}

async function createCourt(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createCourtSchema.safeParse(req.body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const data = parsed.data;
    assertValidHours(data.openTime, data.closeTime);

    const sportType = await prisma.sportType.findUnique({
      where: { id: data.sportTypeId },
      select: { id: true },
    });

    if (!sportType) {
      throw new AppError(400, "Sport type not found.");
    }

    const court = await prisma.court.create({
      data: {
        name: data.name,
        sportTypeId: data.sportTypeId,
        hourlyPrice: data.hourlyPrice,
        openTime: data.openTime,
        closeTime: data.closeTime,
        isActive: data.isActive,
      },
      include: courtInclude,
    });

    return res.status(201).json(serializeCourt(court));
  } catch (error) {
    return next(error);
  }
}

async function updateCourt(req: Request, res: Response, next: NextFunction) {
  try {
    const courtId = getCourtIdParam(req);
    const parsed = updateCourtSchema.safeParse(req.body);
    if (!parsed.success) {
      throw parsed.error;
    }

    if (Object.keys(parsed.data).length === 0) {
      throw new AppError(400, "No updates provided.");
    }

    const existing = await prisma.court.findUnique({
      where: { id: courtId },
      select: {
        id: true,
        openTime: true,
        closeTime: true,
      },
    });

    if (!existing) {
      throw new AppError(404, "Court not found.");
    }

    const nextOpenTime = parsed.data.openTime ?? existing.openTime;
    const nextCloseTime = parsed.data.closeTime ?? existing.closeTime;
    assertValidHours(nextOpenTime, nextCloseTime);

    if (parsed.data.sportTypeId) {
      const sportType = await prisma.sportType.findUnique({
        where: { id: parsed.data.sportTypeId },
        select: { id: true },
      });

      if (!sportType) {
        throw new AppError(400, "Sport type not found.");
      }
    }

    const court = await prisma.court.update({
      where: { id: courtId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.sportTypeId !== undefined
          ? { sportTypeId: parsed.data.sportTypeId }
          : {}),
        ...(parsed.data.hourlyPrice !== undefined
          ? { hourlyPrice: parsed.data.hourlyPrice }
          : {}),
        ...(parsed.data.openTime !== undefined
          ? { openTime: parsed.data.openTime }
          : {}),
        ...(parsed.data.closeTime !== undefined
          ? { closeTime: parsed.data.closeTime }
          : {}),
        ...(parsed.data.isActive !== undefined
          ? { isActive: parsed.data.isActive }
          : {}),
      },
      include: courtInclude,
    });

    return res.json(serializeCourt(court));
  } catch (error) {
    return next(error);
  }
}

router.get("/", requireAuth, listCourts);
router.get("/:courtId", requireAuth, getCourt);
router.post("/", requireAuth, requireAdmin, createCourt);
router.patch("/:courtId", requireAuth, requireAdmin, updateCourt);

export const courtsRouter = router;
