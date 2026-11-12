import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import path from "path";
import { documentsRouter } from "./api/routes/documents.routes";
import { questionSetsRouter } from "./api/routes/questionSets.routes";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
  app.use(express.json());
  app.use("/files", express.static(path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "uploads")));
  app.use("/api/documents", documentsRouter());
  app.use("/api/question-sets", questionSetsRouter());
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Last-resort safety net: any error that reaches here (sync throw forwarded by
  // asyncHandler, or a thrown error from synchronous middleware) gets a clean JSON
  // response instead of crashing the process via an unhandled rejection.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    if (res.headersSent) {
      res.end();
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  });

  return app;
}
