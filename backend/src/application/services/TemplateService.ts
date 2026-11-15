import { randomUUID } from "crypto";
import { inject, injectable } from "tsyringe";
import PizZip from "pizzip";
import { HttpError } from "../../api/HttpError";
import { BuilderConfig, Template } from "../../domain/entities/Template";
import { IFileStorage } from "../../domain/interfaces/IFileStorage";
import { IQuestionPaperTemplateRepository } from "../../domain/interfaces/repositories/IQuestionPaperTemplateRepository";

export const REQUIRED_DOCX_LOOP_TAG = "{#questions}...{/questions}";

@injectable()
export class TemplateService {
  constructor(
    @inject("IQuestionPaperTemplateRepository") private readonly templateRepo: IQuestionPaperTemplateRepository,
    @inject("IFileStorage") private readonly fileStorage: IFileStorage,
  ) {}

  list(userId: string): Promise<Template[]> {
    return this.templateRepo.findAll(userId);
  }

  async createBuilderTemplate(userId: string, name: string, config: BuilderConfig): Promise<Template> {
    const template = new Template(randomUUID(), userId, name, "builder", config, null, new Date());
    return this.templateRepo.create(template);
  }

  async uploadDocxTemplate(userId: string, name: string, buffer: Buffer): Promise<Template> {
    this.assertHasQuestionsLoop(buffer);

    const templateId = randomUUID();
    const storageKey = `${templateId}/template.docx`;
    await this.fileStorage.save(storageKey, buffer);

    const template = new Template(templateId, userId, name, "docx", null, storageKey, new Date());
    return this.templateRepo.create(template);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const template = await this.templateRepo.findById(id, userId);
    if (!template) return false;
    if (template.docxStoragePath) {
      await this.fileStorage.deleteContainingDir(template.docxStoragePath);
    }
    return this.templateRepo.delete(id, userId);
  }

  /**
   * Word splits `{#questions}` across separate XML runs whenever autocorrect
   * or multiple keystrokes touch it, so this checks the run-stripped text of
   * document.xml rather than the raw XML for the tag pair docxtemplater needs.
   */
  private assertHasQuestionsLoop(buffer: Buffer): void {
    let text: string;
    try {
      const zip = new PizZip(buffer);
      const xml = zip.file("word/document.xml")?.asText() ?? "";
      text = xml.replace(/<[^>]+>/g, "");
    } catch {
      throw HttpError.conflict("That file isn't a valid .docx file.");
    }
    if (!text.includes("{#questions}") || !text.includes("{/questions}")) {
      throw HttpError.conflict(
        `Your .docx template must contain the loop tag ${REQUIRED_DOCX_LOOP_TAG} somewhere in the document, ` +
          "with fields like {index}, {stem}, {marks}, {bloom} inside it for each question.",
      );
    }
  }
}
