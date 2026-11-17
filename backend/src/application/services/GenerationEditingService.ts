import { randomUUID } from "crypto";
import { inject, injectable } from "tsyringe";
import { HttpError } from "../../api/HttpError.js";
import { Generation } from "../../domain/entities/Generation.js";
import { GeneratedQuestion } from "../../domain/entities/GeneratedQuestion.js";
import { QuestionType } from "../../domain/entities/Slot.js";
import { IGenerationRepository, QuestionPatch } from "../../domain/interfaces/repositories/IGenerationRepository.js";
import { IQuestionBankRepository } from "../../domain/interfaces/repositories/IQuestionBankRepository.js";

export interface ManualQuestionInput {
  questionType: QuestionType;
  bloom: number;
  marks: number;
}

@injectable()
export class GenerationEditingService {
  constructor(
    @inject("IGenerationRepository") private readonly generationRepo: IGenerationRepository,
    @inject("IQuestionBankRepository") private readonly questionBankRepo: IQuestionBankRepository,
  ) {}

  getGeneration(id: string, userId: string): Promise<Generation | null> {
    return this.generationRepo.findById(id, userId);
  }

  async addManualQuestion(generationId: string, input: ManualQuestionInput, userId: string): Promise<GeneratedQuestion> {
    const generation = await this.generationRepo.findById(generationId, userId);
    if (!generation) throw HttpError.notFound("Generation not found");

    const question: GeneratedQuestion = {
      slotId: randomUUID(),
      chunkIds: [],
      pages: [],
      bloom: input.bloom,
      questionType: input.questionType,
      marks: input.marks,
      difficulty: generation.settings.difficulty,
      stem: null,
      options: input.questionType === "mcq" ? ["", "", "", ""] : null,
      answer: null,
      explanation: null,
      status: "draft",
      reason: null,
      isManual: true,
    };
    await this.generationRepo.addManualQuestion(generationId, question);
    return question;
  }

  async updateQuestion(generationId: string, slotId: string, patch: QuestionPatch, userId: string): Promise<void> {
    const generation = await this.generationRepo.findById(generationId, userId);
    if (!generation) throw HttpError.notFound("Generation not found");

    await this.generationRepo.updateQuestion(generationId, slotId, patch);
    // Keep the chapter-wide question bank in sync with accepts/rejects/edits
    // made from the results page — it only has an entry for slots that
    // reached "draft" in the first place, so this is a no-op otherwise.
    await this.questionBankRepo.patch(generationId, slotId, patch);
  }
}
