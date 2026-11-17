import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import { z } from "zod";
import { Generation } from "../../domain/entities/Generation.js";
import { GeneratedQuestion } from "../../domain/entities/GeneratedQuestion.js";
import { GenerationService } from "../../application/services/GenerationService.js";
import { GenerationEditingService } from "../../application/services/GenerationEditingService.js";
import { GenerationExportService } from "../../application/services/GenerationExportService.js";

const itemSchema = z.object({
  type: z.enum(["mcq", "short_answer", "long_answer"]),
  bloom: z.number().int().min(1).max(6),
  count: z.number().int().min(1),
  marks: z.number().min(0),
});
const pageSplitSchema = z.object({ from: z.number().int(), to: z.number().int(), share: z.number().min(0).max(1) });
const generateSchema = z.object({
  bookId: z.string().min(1),
  chapters: z.array(z.number().int()).min(1),
  topic: z.string().optional(),
  pageSplit: z.array(pageSplitSchema).optional(),
  items: z.array(itemSchema).min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
});
const questionPatchSchema = z.object({
  stem: z.string().optional(),
  options: z.array(z.string()).nullable().optional(),
  answer: z.string().optional(),
  explanation: z.string().optional(),
  status: z.enum(["accepted", "rejected", "draft"]).optional(),
});
const manualQuestionSchema = z.object({
  questionType: z.enum(["mcq", "short_answer", "long_answer"]),
  bloom: z.number().int().min(1).max(6).default(1),
  marks: z.number().min(0),
});
const refineSchema = z.object({
  instruction: z.string().trim().min(1).max(500),
});

@injectable()
export class GenerationsController {
  constructor(
    @inject(GenerationService) private readonly generationService: GenerationService,
    @inject(GenerationEditingService) private readonly editingService: GenerationEditingService,
    @inject(GenerationExportService) private readonly exportService: GenerationExportService,
  ) {}

  generate = async (req: Request, res: Response): Promise<void> => {
    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const generation = await this.generationService.start(parsed.data, req.user!.id);
    res.status(202).json({ generationId: generation.id });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const generation = await this.editingService.getGeneration(req.params.id, req.user!.id);
    if (!generation) {
      res.status(404).json({ error: "Generation not found" });
      return;
    }
    res.json(this.toDto(generation));
  };

  regenerate = async (req: Request, res: Response): Promise<void> => {
    await this.generationService.regenerateSlot(req.params.genId, req.params.slotId, req.user!.id);
    res.status(204).end();
  };

  refineQuestion = async (req: Request, res: Response): Promise<void> => {
    const parsed = refineSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const result = await this.generationService.refineQuestion(req.params.genId, req.params.slotId, parsed.data.instruction, req.user!.id);
    if (result.status === "failed") {
      res.status(422).json({ error: result.reason });
      return;
    }
    res.json(this.questionToDto(result.question));
  };

  addManualQuestion = async (req: Request, res: Response): Promise<void> => {
    const parsed = manualQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const question = await this.editingService.addManualQuestion(req.params.genId, parsed.data, req.user!.id);
    res.status(201).json(this.questionToDto(question));
  };

  updateQuestion = async (req: Request, res: Response): Promise<void> => {
    const parsed = questionPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    await this.editingService.updateQuestion(req.params.genId, req.params.slotId, parsed.data, req.user!.id);
    res.status(204).end();
  };

  download = async (req: Request, res: Response): Promise<void> => {
    const templateId = typeof req.query.templateId === "string" ? req.query.templateId : undefined;
    const result = templateId
      ? await this.exportService.exportWithTemplate(req.params.id, templateId, req.user!.id)
      : await this.exportService.export(req.params.id, req.user!.id);
    if (!result) {
      res.status(404).json({ error: "Generation not found" });
      return;
    }
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  };

  private toDto(generation: Generation) {
    return {
      id: generation.id,
      bookId: generation.bookId,
      settings: generation.settings,
      tokenUsage: generation.tokenUsage,
      createdAt: generation.createdAt,
      questions: generation.questions.map((question) => this.questionToDto(question)),
    };
  }

  private questionToDto(question: GeneratedQuestion) {
    return {
      slotId: question.slotId,
      chunkIds: question.chunkIds,
      pages: question.pages,
      bloom: question.bloom,
      questionType: question.questionType,
      marks: question.marks,
      difficulty: question.difficulty,
      stem: question.stem,
      options: question.options,
      answer: question.answer,
      explanation: question.explanation,
      status: question.status,
      reason: question.reason,
      isManual: question.isManual,
    };
  }
}
