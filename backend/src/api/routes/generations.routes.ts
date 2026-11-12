import { Router } from "express";
import { container } from "tsyringe";
import { GenerationsController } from "../controllers/GenerationsController";
import { asyncHandler } from "../asyncHandler";

export function generationsRouter(): Router {
  const router = Router();
  const controller = container.resolve(GenerationsController);

  router.post("/generate", asyncHandler(controller.generate));
  router.get("/generations/:id", asyncHandler(controller.get));
  router.get("/generations/:id/export", asyncHandler(controller.download));
  router.post("/questions/:genId/:slotId/regenerate", asyncHandler(controller.regenerate));
  router.patch("/questions/:genId/:slotId", asyncHandler(controller.updateQuestion));

  return router;
}
