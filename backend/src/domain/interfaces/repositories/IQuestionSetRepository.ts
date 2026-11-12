import { QuestionSet, QuestionSetStatus, PageSize } from "../../entities/QuestionSet";

export interface QuestionSetPatch {
  title?: string;
  pageSize?: PageSize;
}

export interface IQuestionSetRepository {
  create(questionSet: QuestionSet, pageIds: string[]): Promise<QuestionSet>;
  findById(id: string): Promise<QuestionSet | null>;
  updateStatus(id: string, status: QuestionSetStatus): Promise<void>;
  update(id: string, patch: QuestionSetPatch): Promise<void>;
}
