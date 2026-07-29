import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireAuth";
import { requireAdmin } from "@/middleware/requireAdmin";
import { AppError } from "@/errors/AppError";

const router = Router();

const profileSelect = {
  id: true,
  email: true,
  role: true,
} as const;

async function getMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser) {
      throw new AppError(401, "Unauthorized");
    }

    if (authenticatedUser.email) {
      return res.json({
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: authenticatedUser.id },
      select: profileSelect,
    });

    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    return res.json(user);
  } catch (error) {
    return next(error);
  }
}

async function getProfileById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId;
    if (typeof userId !== "string" || userId.length === 0) {
      throw new AppError(400, "User id is required.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
    });

    if (!user) {
      throw new AppError(404, "Profile not found.");
    }

    return res.json(user);
  } catch (error) {
    return next(error);
  }
}

router.get("/me", requireAuth, getMyProfile);
router.get("/:userId", requireAuth, requireAdmin, getProfileById);

export const profilesRouter = router;
