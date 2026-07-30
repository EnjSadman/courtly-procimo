import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authResponse } from "@/middleware/authResponse";
import { frontendUrl } from "@/config";

const router = Router();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

function formatValidationErrors(error: z.ZodError) {
  return error.issues.map((issue) => issue.message);
}

async function validateCredentials(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsedCredentials = loginSchema.safeParse(req.body);

  if (!parsedCredentials.success) {
    const errors = formatValidationErrors(parsedCredentials.error);

    return res.status(400).json({
      message: errors.join(" "),
      errors,
      issues: z.treeifyError(parsedCredentials.error),
    });
  }

  const { email, password } = parsedCredentials.data;
  req.rememberMe = parsedCredentials.data.rememberMe ?? false;

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

async function registerUser(req: Request, res: Response, next: NextFunction) {
  const parsedRegistration = registerSchema.safeParse(req.body);

  if (!parsedRegistration.success) {
    const errors = formatValidationErrors(parsedRegistration.error);

    return res.status(400).json({
      message: errors.join(" "),
      errors,
      issues: z.treeifyError(parsedRegistration.error),
    });
  }

  const { email, password } = parsedRegistration.data;
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return res
      .status(409)
      .json({ message: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  req.authenticatedUser = user;

  return next();
}

function logout(_req: Request, res: Response) {
  res.clearCookie("token", cookieOptions);
  return res.json({ redirect: `${frontendUrl}/sign-in` });
}

router.post("/login", validateCredentials, authResponse);
router.post("/register", registerUser, authResponse);
router.post("/logout", logout);

export const authRouter = router;
