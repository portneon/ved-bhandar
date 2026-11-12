import { randomUUID } from "crypto";
import { GenerationSettings } from "../../domain/entities/Generation";
import { Slot } from "../../domain/entities/Slot";

export function buildSlots(settings: GenerationSettings): Slot[] {
  const slots: Slot[] = settings.items.flatMap((item) =>
    Array.from({ length: item.count }, () => ({
      slotId: randomUUID(),
      questionType: item.type,
      bloom: item.bloom,
      marks: item.marks,
      chapters: settings.chapters,
      pageRange: null,
    })),
  );

  if (!settings.pageSplit || settings.pageSplit.length === 0) {
    return slots;
  }

  const total = slots.reduce((sum, slot) => sum + slot.marks, 0);
  const budgets = settings.pageSplit.map((range) => ({
    from: range.from,
    to: range.to,
    left: Math.round(range.share * total),
  }));

  const byMarksDescending = [...slots].sort((a, b) => b.marks - a.marks);
  for (const slot of byMarksDescending) {
    const target = budgets.reduce((best, candidate) => (candidate.left > best.left ? candidate : best));
    slot.pageRange = { from: target.from, to: target.to };
    target.left -= slot.marks;
  }

  return slots;
}
