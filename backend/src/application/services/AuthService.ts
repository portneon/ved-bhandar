import { randomUUID } from "crypto";
import { inject, injectable } from "tsyringe";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { HttpError } from "../../api/HttpError.js";
import { User } from "../../domain/entities/User.js";
import { IUserRepository } from "../../domain/interfaces/repositories/IUserRepository.js";

const TOKEN_TTL = "7d";
const BCRYPT_ROUNDS = 10;

export interface AuthInput {
  email: string;
  password: string;
}

export interface RegisterInput extends AuthInput {
  name: string;
}

export interface AuthResult {
  token: string;
  user: { id: string; email: string; name: string; createdAt: Date };
}

export interface TokenPayload {
  id: string;
  email: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to backend/.env (any long random string).");
  }
  return secret;
}

@injectable()
export class AuthService {
  constructor(@inject("IUserRepository") private readonly userRepo: IUserRepository) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw HttpError.conflict("Email is already registered");
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = new User(randomUUID(), email, input.name.trim(), passwordHash, new Date());
    await this.userRepo.create(user);
    return { token: this.issueToken(user), user: this.toSafeUser(user) };
  }

  async login(input: AuthInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const user = await this.userRepo.findByEmail(email);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password");
    }
    return { token: this.issueToken(user), user: this.toSafeUser(user) };
  }

  async getUser(id: string): Promise<AuthResult["user"]> {
    const user = await this.userRepo.findById(id);
    if (!user) throw HttpError.notFound("User not found");
    return this.toSafeUser(user);
  }

  verifyToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, getJwtSecret()) as TokenPayload;
      return { id: payload.id, email: payload.email };
    } catch {
      throw HttpError.unauthorized("Invalid or expired token");
    }
  }

  private issueToken(user: User): string {
    return jwt.sign({ id: user.id, email: user.email } satisfies TokenPayload, getJwtSecret(), { expiresIn: TOKEN_TTL });
  }

  private toSafeUser(user: User): AuthResult["user"] {
    return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
  }
}
