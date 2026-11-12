import { Router } from "express";
import multer from "multer";
import { container } from "tsyringe";
import { DocumentController } from "../controllers/DocumentController";
import { asyncHandler } from "../asyncHandler";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export function documentsRouter(): Router {
  const router = Router();
  const controller = container.resolve(DocumentController);

  router.post("/", upload.single("file"), asyncHandler(controller.upload));
  router.get("/", asyncHandler(controller.list));
  router.get("/:id", asyncHandler(controller.get));
  router.get("/:id/pages", asyncHandler(controller.getPages));

  return router;
}
