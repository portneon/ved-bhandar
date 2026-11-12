import { Router } from "express";
import multer from "multer";
import { container } from "tsyringe";
import { BooksController } from "../controllers/BooksController";
import { asyncHandler } from "../asyncHandler";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

export function booksRouter(): Router {
  const router = Router();
  const controller = container.resolve(BooksController);

  router.post("/", upload.single("file"), asyncHandler(controller.upload));
  router.get("/", asyncHandler(controller.list));
  router.get("/:id", asyncHandler(controller.get));

  return router;
}
