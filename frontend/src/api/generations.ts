import { api } from "./client";
import { Generation, GenerationSettings } from "../types";

export interface QuestionPatch {
  stem?: string;
  options?: string[] | null;
  answer?: string;
  explanation?: string;
  status?: "accepted" | "rejected" | "draft";
}

export function createGeneration(settings: GenerationSettings): Promise<{ generationId: string }> {
  return api.post<{ generationId: string }>("/api/generate", settings);
}

export function getGeneration(id: string): Promise<Generation> {
  return api.get<Generation>(`/api/generations/${id}`);
}

export function regenerateSlot(generationId: string, slotId: string): Promise<void> {
  return api.post<void>(`/api/questions/${generationId}/${slotId}/regenerate`);
}

export function patchQuestion(generationId: string, slotId: string, patch: QuestionPatch): Promise<void> {
  return api.patch<void>(`/api/questions/${generationId}/${slotId}`, patch);
}

export function exportUrl(generationId: string): string {
  return api.fileUrl(`/api/generations/${generationId}/export`);
}
