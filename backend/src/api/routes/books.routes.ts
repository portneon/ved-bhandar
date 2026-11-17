import { Router } from "express";
import multer from "multer";
import { container } from "tsyringe";
import { BooksController } from "../controllers/BooksController.js";
import { asyncHandler } from "../asyncHandler.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });
// Vercel caps request bodies at ~4.5MB; chunks are sent well under that.
const chunkUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });

export function booksRouter(): Router {
  const router = Router();
  const controller = container.resolve(BooksController);

  router.post("/chunks", chunkUpload.single("chunk"), asyncHandler(controller.uploadChunk));
  router.post("/", upload.single("file"), asyncHandler(controller.upload));
  router.get("/", asyncHandler(controller.list));
  router.get("/:id", asyncHandler(controller.get));
  router.delete("/:id", asyncHandler(controller.delete));
  router.get("/:id/generations", asyncHandler(controller.listGenerations));
  router.get("/:id/question-bank", asyncHandler(controller.questionBank));

  return router;
}
