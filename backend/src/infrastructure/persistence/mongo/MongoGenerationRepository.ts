import { inject, injectable } from "tsyringe";
import { Collection, Db } from "mongodb";
import { TokenUsage } from "../../../domain/entities/Book.js";
import { Generation, GenerationSettings } from "../../../domain/entities/Generation.js";
import { GeneratedQuestion } from "../../../domain/entities/GeneratedQuestion.js";
import { Slot } from "../../../domain/entities/Slot.js";
import { IGenerationRepository, QuestionPatch } from "../../../domain/interfaces/repositories/IGenerationRepository.js";

interface GenerationDoc {
  _id: string;
  bookId: string;
  userId: string;
  settings: GenerationSettings;
  slots: Slot[];
  questions: GeneratedQuestion[];
  tokenUsage: TokenUsage;
  createdAt: Date;
}

@injectable()
export class MongoGenerationRepository implements IGenerationRepository {
  private readonly collection: Collection<GenerationDoc>;

  constructor(@inject("Db") db: Db) {
    this.collection = db.collection<GenerationDoc>("generations");
  }

  async create(generation: Generation): Promise<Generation> {
    await this.collection.insertOne(this.toDoc(generation));
    return generation;
  }

  async findById(id: string, userId: string): Promise<Generation | null> {
    const doc = await this.collection.findOne({ _id: id, userId });
    return doc ? this.toDomain(doc) : null;
  }

  async findByBookId(bookId: string, userId: string): Promise<Generation[]> {
    const docs = await this.collection.find({ bookId, userId }).sort({ createdAt: -1 }).toArray();
    return docs.map((doc) => this.toDomain(doc));
  }

  async upsertQuestion(generationId: string, question: GeneratedQuestion): Promise<void> {
    await this.collection.updateOne(
      { _id: generationId, "questions.slotId": question.slotId },
      { $set: { "questions.$": question } },
    );
  }

  async addManualQuestion(generationId: string, question: GeneratedQuestion): Promise<void> {
    await this.collection.updateOne({ _id: generationId }, { $push: { questions: question } });
  }

  async updateQuestion(generationId: string, slotId: string, patch: QuestionPatch): Promise<void> {
    const setFields: Record<string, unknown> = {};
    if (patch.stem !== undefined) setFields["questions.$.stem"] = patch.stem;
    if (patch.options !== undefined) setFields["questions.$.options"] = patch.options;
    if (patch.answer !== undefined) setFields["questions.$.answer"] = patch.answer;
    if (patch.explanation !== undefined) setFields["questions.$.explanation"] = patch.explanation;
    if (patch.status !== undefined) setFields["questions.$.status"] = patch.status;
    if (Object.keys(setFields).length === 0) return;
    await this.collection.updateOne({ _id: generationId, "questions.slotId": slotId }, { $set: setFields });
  }

  async addTokenUsage(generationId: string, usage: TokenUsage): Promise<void> {
    await this.collection.updateOne(
      { _id: generationId },
      { $inc: { "tokenUsage.input": usage.input, "tokenUsage.output": usage.output } },
    );
  }

  async deleteByBookId(bookId: string): Promise<void> {
    await this.collection.deleteMany({ bookId });
  }

  private toDoc(generation: Generation): GenerationDoc {
    return {
      _id: generation.id,
      bookId: generation.bookId,
      userId: generation.userId,
      settings: generation.settings,
      slots: generation.slots,
      questions: generation.questions,
      tokenUsage: generation.tokenUsage,
      createdAt: generation.createdAt,
    };
  }

  private toDomain(doc: GenerationDoc): Generation {
    return new Generation(doc._id, doc.bookId, doc.userId, doc.settings, doc.slots, doc.questions, doc.tokenUsage, doc.createdAt);
  }
}
