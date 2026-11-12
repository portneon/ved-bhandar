import { QuestionSet } from "../entities/QuestionSet";
import { Question } from "../entities/Question";

export interface IDocumentExporter {
  readonly contentType: string;
  readonly fileExtension: string;
  export(questionSet: QuestionSet, questions: Question[]): Promise<Buffer>;
}
