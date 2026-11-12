import { injectable, inject } from "tsyringe";
import { randomUUID } from "crypto";
import { Question } from "../../domain/entities/Question";
import { QuestionSet } from "../../domain/entities/QuestionSet";
import { IQuestionRepository, QuestionPatch } from "../../domain/interfaces/repositories/IQuestionRepository";
import { IQuestionSetRepository, QuestionSetPatch } from "../../domain/interfaces/repositories/IQuestionSetRepository";

export interface QuestionSetWithQuestions {
  questionSet: QuestionSet;
  questions: Question[];
}

@injectable()
export class QuestionEditingService {
  constructor(
    @inject("IQuestionSetRepository") private readonly questionSetRepo: IQuestionSetRepository,
    @inject("IQuestionRepository") private readonly questionRepo: IQuestionRepository,
  ) {}

  async getQuestionSet(id: string): Promise<QuestionSetWithQuestions | null> {
    const questionSet = await this.questionSetRepo.findById(id);
    if (!questionSet) return null;
    const questions = await this.questionRepo.findByQuestionSetId(id);
    return { questionSet, questions };
  }

  updateQuestion(id: string, patch: QuestionPatch): Promise<void> {
    return this.questionRepo.update(id, patch);
  }

  async addQuestion(questionSetId: string, patch: QuestionPatch): Promise<Question> {
    const existing = await this.questionRepo.findByQuestionSetId(questionSetId);
    const question = new Question(
      randomUUID(),
      questionSetId,
      existing.length,
      patch.type ?? "short_answer",
      patch.prompt ?? "",
      patch.options ?? null,
      patch.correctAnswer ?? null,
      patch.marks ?? null,
    );
    return this.questionRepo.create(question);
  }

  deleteQuestion(id: string): Promise<void> {
    return this.questionRepo.delete(id);
  }

  updateQuestionSet(id: string, patch: QuestionSetPatch): Promise<void> {
    return this.questionSetRepo.update(id, patch);
  }

  finalize(questionSetId: string): Promise<void> {
    return this.questionSetRepo.updateStatus(questionSetId, "finalized");
  }
}
