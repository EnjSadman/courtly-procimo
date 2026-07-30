import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { frontendUrl } from "@/config";
import { authRouter } from "@/routes/auth";
import { profilesRouter } from "@/routes/profiles";
import { courtsRouter } from "@/routes/courts";
import { bookingsRouter } from "@/routes/bookings";
import { sportTypesRouter } from "@/routes/sportTypes";
import { errorHandler } from "@/middleware/errorHandler";
import { createLimiter, rateConfigs } from "@/lib/rateLimit";

export const app = express();

const authLimiter = createLimiter(rateConfigs.auth);
const defaultLimiter = createLimiter(rateConfigs.default);

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(helmet());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use("/auth", authLimiter, authRouter);
app.use("/profiles", defaultLimiter, profilesRouter);
app.use("/courts", defaultLimiter, courtsRouter);
app.use("/sport-types", defaultLimiter, sportTypesRouter);
app.use("/bookings", bookingsRouter);

app.use(errorHandler);
