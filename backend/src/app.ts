import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import path from "path";
import { booksRouter } from "./api/routes/books.routes";
import { generationsRouter } from "./api/routes/generations.routes";
import { authRouter } from "./api/routes/auth.routes";
import { templatesRouter } from "./api/routes/templates.routes";
import { requireAuth } from "./api/middleware/requireAuth";
import { HttpError } from "./api/HttpError";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
  app.use(express.json());
  app.use("/files", express.static(path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "uploads")));
  app.use("/api/auth", authRouter());
  app.use("/api/books", requireAuth, booksRouter());
  app.use("/api/templates", requireAuth, templatesRouter());
  app.use("/api", requireAuth, generationsRouter());
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Last-resort safety net: any error that reaches here (sync throw forwarded by
  // asyncHandler, or a thrown error from synchronous middleware) gets a clean JSON
  // response instead of crashing the process via an unhandled rejection.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof HttpError ? err.statusCode : 500;
    if (status === 500) console.error(err);
    if (res.headersSent) {
      res.end();
      return;
    }
    res.status(status).json({ error: err instanceof Error ? err.message : "Internal server error" });
  });

  return app;
}
