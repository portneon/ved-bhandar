import { api } from "./client";
import { GeneratedQuestion, Generation, GenerationSettings, QuestionType } from "../types";

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

export function refineQuestion(generationId: string, slotId: string, instruction: string): Promise<GeneratedQuestion> {
  return api.post<GeneratedQuestion>(`/api/questions/${generationId}/${slotId}/refine`, { instruction });
}

export function patchQuestion(generationId: string, slotId: string, patch: QuestionPatch): Promise<void> {
  return api.patch<void>(`/api/questions/${generationId}/${slotId}`, patch);
}

export interface ManualQuestionInput {
  questionType: QuestionType;
  bloom?: number;
  marks: number;
}

export function addManualQuestion(generationId: string, input: ManualQuestionInput): Promise<GeneratedQuestion> {
  return api.post<GeneratedQuestion>(`/api/questions/${generationId}/manual`, input);
}

export function exportPath(generationId: string, templateId?: string): string {
  const query = templateId ? `?templateId=${templateId}` : "";
  return `/api/generations/${generationId}/export${query}`;
}
