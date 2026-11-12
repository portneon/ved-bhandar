export type QuestionType = "mcq" | "short_answer" | "long_answer";

export class Question {
  constructor(
    public readonly id: string,
    public readonly questionSetId: string,
    public orderIndex: number,
    public type: QuestionType,
    public prompt: string,
    public options: string[] | null,
    public correctAnswer: string | null,
    public marks: number | null,
  ) {}
}
