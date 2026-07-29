import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireAuth";

const router = Router();

async function listSportTypes(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const sportTypes = await prisma.sportType.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
      },
    });

    return res.json({ sportTypes });
  } catch (error) {
    return next(error);
  }
}

router.get("/", requireAuth, listSportTypes);

export const sportTypesRouter = router;
