import { Router, type NextFunction, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirectByRole } from "@/middleware/redirectByRole";

const router = Router();

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

async function validateCredentials(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsedCredentials = loginSchema.safeParse(req.body);

  if (!parsedCredentials.success) {
    return res.status(400).json({
      message: "Invalid login payload.",
      issues: z.treeifyError(parsedCredentials.error),
    });
  }

  const { email, password } = parsedCredentials.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
    },
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  req.authenticatedUser = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return next();
}

router.post("/login", validateCredentials, redirectByRole);

export const authRouter = router;
