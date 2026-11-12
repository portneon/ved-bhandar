import { inject, injectable } from "tsyringe";
import { Generation } from "../../domain/entities/Generation";
import { IGenerationRepository, QuestionPatch } from "../../domain/interfaces/repositories/IGenerationRepository";

@injectable()
export class GenerationEditingService {
  constructor(@inject("IGenerationRepository") private readonly generationRepo: IGenerationRepository) {}

  getGeneration(id: string): Promise<Generation | null> {
    return this.generationRepo.findById(id);
  }

  updateQuestion(generationId: string, slotId: string, patch: QuestionPatch): Promise<void> {
    return this.generationRepo.updateQuestion(generationId, slotId, patch);
  }
}
