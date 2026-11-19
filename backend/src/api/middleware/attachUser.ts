import { NextFunction, Request, Response } from "express";

// Authentication is disabled for now; every request acts as this single default user.
export const DEFAULT_USER_ID = "default-user";

export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  req.user = { id: DEFAULT_USER_ID, email: "default@local" };
  next();
}
