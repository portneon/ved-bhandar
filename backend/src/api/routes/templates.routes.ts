import { Router } from "express";
import multer from "multer";
import { container } from "tsyringe";
import { TemplatesController } from "../controllers/TemplatesController";
import { asyncHandler } from "../asyncHandler";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

export function templatesRouter(): Router {
  const router = Router();
  const controller = container.resolve(TemplatesController);

  router.post("/", asyncHandler(controller.create));
  router.post("/docx", upload.single("file"), asyncHandler(controller.uploadDocx));
  router.get("/", asyncHandler(controller.list));
  router.delete("/:id", asyncHandler(controller.delete));

  return router;
}
