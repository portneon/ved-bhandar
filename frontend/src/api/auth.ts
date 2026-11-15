import { api } from "./client";
import { User } from "../types";

export interface AuthResult {
  token: string;
  user: User;
}

export function register(input: { name: string; email: string; password: string }): Promise<AuthResult> {
  return api.post<AuthResult>("/api/auth/register", input);
}

export function login(input: { email: string; password: string }): Promise<AuthResult> {
  return api.post<AuthResult>("/api/auth/login", input);
}

export function me(): Promise<User> {
  return api.get<User>("/api/auth/me");
}
