import { Question } from "../../entities/Question";

export type QuestionPatch = Partial<
  Pick<Question, "type" | "prompt" | "options" | "correctAnswer" | "marks" | "orderIndex">
>;

export interface IQuestionRepository {
  create(question: Question): Promise<Question>;
  createMany(questions: Question[]): Promise<Question[]>;
  findByQuestionSetId(questionSetId: string): Promise<Question[]>;
  update(id: string, patch: QuestionPatch): Promise<void>;
  delete(id: string): Promise<void>;
}
