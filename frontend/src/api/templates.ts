import { api } from "./client";
import { BuilderConfig, Template } from "../types";

export function listTemplates(): Promise<Template[]> {
  return api.get<Template[]>("/api/templates");
}

export function createBuilderTemplate(name: string, config: BuilderConfig): Promise<Template> {
  return api.post<Template>("/api/templates", { name, config });
}

export function uploadDocxTemplate(name: string, file: File): Promise<Template> {
  const form = new FormData();
  form.append("file", file);
  form.append("name", name);
  return api.post<Template>("/api/templates/docx", form);
}

export function deleteTemplate(id: string): Promise<void> {
  return api.delete<void>(`/api/templates/${id}`);
}
