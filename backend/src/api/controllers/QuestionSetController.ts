import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import { z } from "zod";
import { QuestionSet } from "../../domain/entities/QuestionSet";
import { Question } from "../../domain/entities/Question";
import { QuestionGenerationService } from "../../application/services/QuestionGenerationService";
import { QuestionEditingService } from "../../application/services/QuestionEditingService";
import { ExportService } from "../../application/services/ExportService";

const generateSchema = z.object({
  documentId: z.string().uuid(),
  pageIds: z.array(z.string().uuid()).min(1),
  title: z.string().min(1),
  pageSize: z.enum(["A4", "LETTER", "LEGAL"]).optional(),
  config: z.object({
    distribution: z.record(z.string(), z.number().int().min(0)),
    difficulty: z.enum(["easy", "medium", "hard"]),
    language: z.string().min(1),
    customInstructions: z.string().optional(),
    model: z.string().min(1),
  }),
});

const patchSchema = z.object({
  type: z.enum(["mcq", "short_answer", "long_answer"]).optional(),
  prompt: z.string().optional(),
  options: z.array(z.string()).nullable().optional(),
  correctAnswer: z.string().nullable().optional(),
  marks: z.number().nullable().optional(),
});

const questionSetPatchSchema = z.object({
  title: z.string().min(1).optional(),
  pageSize: z.enum(["A4", "LETTER", "LEGAL"]).optional(),
});

@injectable()
export class QuestionSetController {
  constructor(
    @inject(QuestionGenerationService) private readonly generationService: QuestionGenerationService,
    @inject(QuestionEditingService) private readonly editingService: QuestionEditingService,
    @inject(ExportService) private readonly exportService: ExportService,
  ) {}

  generate = async (req: Request, res: Response): Promise<void> => {
    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    try {
      const { questionSet, questions } = await this.generationService.generate(parsed.data);
      res.status(201).json(this.toDto(questionSet, questions));
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : "Generation failed" });
    }
  };

  generateStream = async (req: Request, res: Response): Promise<void> => {
    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const send = (event: string, data: unknown): void => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await this.generationService.generateStream(
        parsed.data,
        (questionSet) =>
          send("init", {
            id: questionSet.id,
            title: questionSet.title,
            status: questionSet.status,
            pageSize: questionSet.pageSize,
          }),
        (question) => send("question", this.questionToDto(question)),
      );
      send("done", {});
    } catch (error) {
      send("error", { message: error instanceof Error ? error.message : "Generation failed" });
    } finally {
      res.end();
    }
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const result = await this.editingService.getQuestionSet(req.params.id);
    if (!result) {
      res.status(404).json({ error: "Question set not found" });
      return;
    }
    res.json(this.toDto(result.questionSet, result.questions));
  };

  updateQuestion = async (req: Request, res: Response): Promise<void> => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    await this.editingService.updateQuestion(req.params.questionId, parsed.data);
    res.status(204).end();
  };

  addQuestion = async (req: Request, res: Response): Promise<void> => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const question = await this.editingService.addQuestion(req.params.id, parsed.data);
    res.status(201).json(this.questionToDto(question));
  };

  deleteQuestion = async (req: Request, res: Response): Promise<void> => {
    await this.editingService.deleteQuestion(req.params.questionId);
    res.status(204).end();
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const parsed = questionSetPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    await this.editingService.updateQuestionSet(req.params.id, parsed.data);
    res.status(204).end();
  };

  finalize = async (req: Request, res: Response): Promise<void> => {
    await this.editingService.finalize(req.params.id);
    res.status(204).end();
  };

  download = async (req: Request, res: Response): Promise<void> => {
    const result = await this.exportService.export(req.params.id);
    if (!result) {
      res.status(404).json({ error: "Question set not found" });
      return;
    }
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  };

  private toDto(questionSet: QuestionSet, questions: Question[]) {
    return {
      id: questionSet.id,
      documentId: questionSet.documentId,
      title: questionSet.title,
      status: questionSet.status,
      config: questionSet.config,
      pageSize: questionSet.pageSize,
      createdAt: questionSet.createdAt,
      questions: questions.map((question) => this.questionToDto(question)),
    };
  }

  private questionToDto(question: Question) {
    return {
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      options: question.options,
      correctAnswer: question.correctAnswer,
      marks: question.marks,
      orderIndex: question.orderIndex,
    };
  }
}
