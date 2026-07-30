import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "@/routes/auth";
import { profilesRouter } from "@/routes/profiles";
import { courtsRouter } from "@/routes/courts";
import { bookingsRouter } from "@/routes/bookings";
import { sportTypesRouter } from "@/routes/sportTypes";
import { errorHandler } from "@/middleware/errorHandler";
import rateLimit from "express-rate-limit";

export const app = express();
export const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
});

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet());
app.use(globalLimiter);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/profiles", profilesRouter);
app.use("/courts", courtsRouter);
app.use("/bookings", bookingsRouter);
app.use("/sport-types", sportTypesRouter);

app.use(errorHandler);
