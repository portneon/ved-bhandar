import { Router } from "express";
import { container } from "tsyringe";
import { AuthController } from "../controllers/AuthController.js";
import { asyncHandler } from "../asyncHandler.js";
import { requireAuth } from "../middleware/requireAuth.js";

export function authRouter(): Router {
  const router = Router();
  const controller = container.resolve(AuthController);

  router.post("/register", asyncHandler(controller.register));
  router.post("/login", asyncHandler(controller.login));
  router.get("/me", requireAuth, asyncHandler(controller.me));

  return router;
}
