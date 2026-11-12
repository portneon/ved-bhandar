import { Router } from "express";
import { container } from "tsyringe";
import { QuestionSetController } from "../controllers/QuestionSetController";
import { asyncHandler } from "../asyncHandler";

export function questionSetsRouter(): Router {
  const router = Router();
  const controller = container.resolve(QuestionSetController);

  router.post("/", asyncHandler(controller.generate));
  router.post("/stream", asyncHandler(controller.generateStream));
  router.get("/:id", asyncHandler(controller.get));
  router.patch("/:id", asyncHandler(controller.update));
  router.patch("/:id/questions/:questionId", asyncHandler(controller.updateQuestion));
  router.post("/:id/questions", asyncHandler(controller.addQuestion));
  router.delete("/:id/questions/:questionId", asyncHandler(controller.deleteQuestion));
  router.post("/:id/finalize", asyncHandler(controller.finalize));
  router.get("/:id/download", asyncHandler(controller.download));

  return router;
}
