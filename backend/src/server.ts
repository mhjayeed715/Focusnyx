import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/error.middleware.js";
import { academicRoutes } from "./routes/academic.routes.js";
import { analyticsRoutes } from "./routes/analytics.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { blocklistRoutes } from "./routes/blocklist.routes.js";
import { coachRoutes } from "./routes/coach.routes.js";
import { financeRoutes } from "./routes/finance.routes.js";
import { focusRoutes } from "./routes/focus.routes.js";
import { healthRoutes } from "./routes/health.routes.js";
import { notesRoutes } from "./routes/notes.routes.js";
import { tasksRoutes } from "./routes/tasks.routes.js";
import { wellnessRoutes } from "./routes/wellness.routes.js";

dotenv.config();

export function buildServer() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  app.use("/health", healthRoutes);
  app.use("/auth", authRoutes);
  app.use("/tasks", tasksRoutes);
  app.use("/focus", focusRoutes);
  app.use("/notes", notesRoutes);
  app.use("/finance", financeRoutes);
  app.use("/wellness", wellnessRoutes);
  app.use("/coach", coachRoutes);
  app.use("/analytics", analyticsRoutes);
  app.use("/blocklist", blocklistRoutes);
  app.use("/academic", academicRoutes);

  app.use(errorHandler);

  return app;
}
