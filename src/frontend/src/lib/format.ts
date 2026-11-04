import {
  AssessmentStatus,
  AttemptStatus,
  EducationLevel,
  QuestionKind,
} from "@/backend";

/** Motoko Time.now() values are nanosecond bigints. */
export function timestampToDate(timestamp: bigint): Date | null {
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(timestamp: bigint): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(timestamp: bigint): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function educationLevelLabel(level: EducationLevel): string {
  return level === EducationLevel.sdMi ? "SD/MI" : "SMP/MTs";
}

export function assessmentStatusLabel(status: AssessmentStatus): string {
  switch (status) {
    case AssessmentStatus.draft:
      return "Draft";
    case AssessmentStatus.published:
      return "Aktif";
    case AssessmentStatus.closed:
      return "Selesai";
  }
}

export function attemptStatusLabel(status: AttemptStatus): string {
  switch (status) {
    case AttemptStatus.inProgress:
      return "Sedang Dikerjakan";
    case AttemptStatus.awaitingReview:
      return "Menunggu Pemeriksaan";
    case AttemptStatus.graded:
      return "Selesai Dinilai";
  }
}

export function questionKindLabel(kind: QuestionKind): string {
  switch (kind) {
    case QuestionKind.multipleChoice:
      return "Pilihan Ganda";
    case QuestionKind.trueFalse:
      return "Benar/Salah";
    case QuestionKind.shortAnswer:
      return "Isian Singkat";
    case QuestionKind.essay:
      return "Esai";
  }
}

/** Final score = (earned ÷ total weight) × 100, rounded to one decimal. */
export function computeFinalScore(earned: bigint, totalWeight: bigint): number {
  if (totalWeight === 0n) return 0;
  return Math.round((Number(earned) / Number(totalWeight)) * 1000) / 10;
}
