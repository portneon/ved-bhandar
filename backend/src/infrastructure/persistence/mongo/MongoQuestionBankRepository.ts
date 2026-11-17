import { inject, injectable } from "tsyringe";
import { Collection, Db } from "mongodb";
import { QuestionBankEntry } from "../../../domain/entities/QuestionBankEntry.js";
import { IQuestionBankRepository, QuestionBankPatch } from "../../../domain/interfaces/repositories/IQuestionBankRepository.js";

interface QuestionBankDoc extends Omit<QuestionBankEntry, "id"> {
  _id: string;
}

@injectable()
export class MongoQuestionBankRepository implements IQuestionBankRepository {
  private readonly collection: Collection<QuestionBankDoc>;

  constructor(@inject("Db") db: Db) {
    this.collection = db.collection<QuestionBankDoc>("question_bank");
  }

  async upsert(entry: QuestionBankEntry): Promise<void> {
    const { id, createdAt, ...rest } = entry;
    await this.collection.updateOne(
      { _id: id },
      { $set: rest, $setOnInsert: { createdAt } },
      { upsert: true },
    );
  }

  async patch(generationId: string, slotId: string, patch: QuestionBankPatch): Promise<void> {
    const setFields: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.stem !== undefined) setFields.stem = patch.stem;
    if (patch.options !== undefined) setFields.options = patch.options;
    if (patch.answer !== undefined) setFields.answer = patch.answer;
    if (patch.explanation !== undefined) setFields.explanation = patch.explanation;
    if (patch.status !== undefined) setFields.status = patch.status;
    await this.collection.updateOne({ _id: `${generationId}:${slotId}` }, { $set: setFields });
  }

  async findByBook(bookId: string, userId: string, chapter?: number): Promise<QuestionBankEntry[]> {
    const filter = chapter !== undefined ? { bookId, userId, chapters: chapter } : { bookId, userId };
    const docs = await this.collection.find(filter).sort({ createdAt: -1 }).toArray();
    return docs.map((doc) => this.toDomain(doc));
  }

  async deleteByBookId(bookId: string): Promise<void> {
    await this.collection.deleteMany({ bookId });
  }

  private toDomain(doc: QuestionBankDoc): QuestionBankEntry {
    const { _id, ...rest } = doc;
    return { ...rest, id: _id };
  }
}
