import { Template } from "../../entities/Template.js";

export interface IQuestionPaperTemplateRepository {
  create(template: Template): Promise<Template>;
  findById(id: string, userId: string): Promise<Template | null>;
  findAll(userId: string): Promise<Template[]>;
  delete(id: string, userId: string): Promise<boolean>;
}
