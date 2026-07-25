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

  const router = express.Router();
  router.use("/health", healthRoutes);
  router.use("/auth", authRoutes);
  router.use("/tasks", tasksRoutes);
  router.use("/focus", focusRoutes);
  router.use("/notes", notesRoutes);
  router.use("/finance", financeRoutes);
  router.use("/wellness", wellnessRoutes);
  router.use("/coach", coachRoutes);
  router.use("/analytics", analyticsRoutes);
  router.use("/blocklist", blocklistRoutes);
  router.use("/academic", academicRoutes);

  app.use("/", router);
  app.use("/api/backend", router);
  app.use("/api", router);

  app.use(errorHandler);

  return app;
}
