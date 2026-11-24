import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import { z } from "zod";
import { Template } from "../../domain/entities/Template.js";
import { TemplateService } from "../../application/services/TemplateService.js";
import { HttpError } from "../HttpError.js";

const builderConfigSchema = z.object({
  schoolName: z.string().trim().max(200).default(""),
  headerText: z.string().trim().max(400).default(""),
  footerText: z.string().trim().max(400).default(""),
  showBloom: z.boolean().default(true),
  showMarks: z.boolean().default(true),
});
const createBuilderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  config: builderConfigSchema,
});

// .docx files are zip archives; a valid one always starts with the local-file-header signature.
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

function isDocx(buffer: Buffer): boolean {
  return buffer.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC);
}

@injectable()
export class TemplatesController {
  constructor(@inject(TemplateService) private readonly templateService: TemplateService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const parsed = createBuilderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const template = await this.templateService.createBuilderTemplate(req.user!.id, parsed.data.name, parsed.data.config);
    res.status(201).json(this.toDto(template));
  };

  uploadDocx = async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    if (!isDocx(file.buffer)) {
      res.status(400).json({ error: "File is not a valid .docx" });
      return;
    }
    const name = typeof req.body.name === "string" && req.body.name.trim() ? req.body.name.trim() : file.originalname;
    const template = await this.templateService.uploadDocxTemplate(req.user!.id, name, file.buffer);
    res.status(201).json(this.toDto(template));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const templates = await this.templateService.list(req.user!.id);
    res.json(templates.map((template) => this.toDto(template)));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const deleted = await this.templateService.delete(req.params.id, req.user!.id);
    if (!deleted) throw HttpError.notFound("Template not found");
    res.status(204).end();
  };

  private toDto(template: Template) {
    return {
      id: template.id,
      name: template.name,
      kind: template.kind,
      builderConfig: template.builderConfig,
      createdAt: template.createdAt,
    };
  }
}
