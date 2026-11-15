import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "../../application/services/AuthService";
import { HttpError } from "../HttpError";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});
const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
});

@injectable()
export class AuthController {
  constructor(@inject(AuthService) private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const result = await this.authService.register(parsed.data);
    res.status(201).json(result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const result = await this.authService.login(parsed.data);
    res.json(result);
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw HttpError.unauthorized();
    const user = await this.authService.getUser(req.user.id);
    res.json(user);
  };
}
