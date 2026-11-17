import { NextFunction, Request, Response } from "express";
import { container } from "tsyringe";
import { HttpError } from "../HttpError.js";
import { AuthService } from "../../application/services/AuthService.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization") ?? req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : undefined;
  if (!token) {
    next(HttpError.unauthorized("Not authenticated"));
    return;
  }
  try {
    const authService = container.resolve(AuthService);
    const payload = authService.verifyToken(token);
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch (error) {
    next(error);
  }
}
