import { QuestionKind } from "@/backend";
import type { Question } from "@/backend";
import * as XLSX from "xlsx";

/** Column headers of the prepared template, in order. */
export const TEMPLATE_HEADERS = [
  "nomor soal",
  "jenis soal",
  "pertanyaan",
  "pilihan A",
  "pilihan B",
  "pilihan C",
  "pilihan D",
  "kunci jawaban",
  "bobot nilai",
] as const;

/** A parsed row that failed validation, reported by question number. */
export type RowError = {
  number: number;
  message: string;
};

export type ParseResult = {
  questions: Question[];
  errors: RowError[];
};

/** Normalize a header cell for tolerant matching. */
function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Map a free-text "jenis soal" cell to a QuestionKind, or null when unknown. */
export function parseQuestionKind(raw: string): QuestionKind | null {
  const value = raw.trim().toLowerCase();
  if (value === "") return null;
  if (
    value.includes("pilihan ganda") ||
    value === "pg" ||
    value === "multiple choice" ||
    value === "multiplechoice"
  ) {
    return QuestionKind.multipleChoice;
  }
  if (
    value.includes("benar") ||
    value.includes("salah") ||
    value === "true/false" ||
    value === "truefalse" ||
    value === "b/s"
  ) {
    return QuestionKind.trueFalse;
  }
  if (value.includes("isian") || value.includes("singkat")) {
    return QuestionKind.shortAnswer;
  }
  if (value.includes("esai") || value.includes("uraian")) {
    return QuestionKind.essay;
  }
  return null;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cellNumber(value: unknown): number {
  const text = cellText(value).replace(",", ".");
  if (text === "") return Number.NaN;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * Parse an uploaded .xlsx workbook into questions and per-row validation
 * errors. Mirrors the backend's validation rules so nothing invalid is sent.
 */
export function parseQuestionsWorkbook(data: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      questions: [],
      errors: [{ number: 0, message: "File tidak memiliki lembar kerja" }],
    };
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  if (rows.length === 0) {
    return {
      questions: [],
      errors: [{ number: 0, message: "File tidak berisi baris soal" }],
    };
  }

  const headerRow = rows[0].map(normalizeHeader);
  const columnIndex = new Map<string, number>();
  headerRow.forEach((header, index) => {
    if (header !== "" && !columnIndex.has(header)) {
      columnIndex.set(header, index);
    }
  });

  const requiredHeaders = TEMPLATE_HEADERS.filter(
    (header) => !columnIndex.has(header),
  );
  if (requiredHeaders.length > 0) {
    return {
      questions: [],
      errors: [
        {
          number: 0,
          message: `Kolom wajib tidak ditemukan: ${requiredHeaders.join(", ")}`,
        },
      ],
    };
  }

  const at = (row: unknown[], header: string): unknown => {
    const index = columnIndex.get(header);
    return index === undefined ? "" : row[index];
  };

  const questions: Question[] = [];
  const errors: RowError[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const numberRaw = cellNumber(at(row, "nomor soal"));
    const number = Number.isFinite(numberRaw) ? Math.trunc(numberRaw) : 0;
    const kindRaw = cellText(at(row, "jenis soal"));
    const kind = parseQuestionKind(kindRaw);
    const text = cellText(at(row, "pertanyaan"));
    const optionA = cellText(at(row, "pilihan A"));
    const optionB = cellText(at(row, "pilihan B"));
    const optionC = cellText(at(row, "pilihan C"));
    const optionD = cellText(at(row, "pilihan D"));
    const answerKey = cellText(at(row, "kunci jawaban"));
    const weightRaw = cellNumber(at(row, "bobot nilai"));
    const weight = Number.isFinite(weightRaw) ? Math.trunc(weightRaw) : 0;

    // Skip fully empty rows silently.
    const isBlank =
      number === 0 &&
      kindRaw === "" &&
      text === "" &&
      answerKey === "" &&
      weight === 0;
    if (isBlank) continue;

    const rowErrors: string[] = [];
    if (number === 0) rowErrors.push("Nomor soal wajib diisi");
    if (kind === null) {
      rowErrors.push(
        "Jenis soal tidak dikenali (gunakan: Pilihan Ganda, Benar/Salah, Isian Singkat, atau Esai)",
      );
    }
    if (text === "") rowErrors.push("Pertanyaan wajib diisi");
    if (weight <= 0) rowErrors.push("Bobot nilai harus lebih dari 0");

    if (kind === QuestionKind.multipleChoice) {
      if (!optionA || !optionB || !optionC || !optionD) {
        rowErrors.push("Pilihan ganda memerlukan pilihan A sampai D");
      }
      const key = answerKey.toUpperCase();
      if (key !== "A" && key !== "B" && key !== "C" && key !== "D") {
        rowErrors.push("Kunci pilihan ganda harus A, B, C, atau D");
      }
    } else if (kind === QuestionKind.trueFalse) {
      const key = answerKey.toUpperCase();
      if (key !== "BENAR" && key !== "SALAH") {
        rowErrors.push("Kunci Benar/Salah harus BENAR atau SALAH");
      }
    } else if (kind === QuestionKind.shortAnswer) {
      if (answerKey === "") rowErrors.push("Kunci isian singkat wajib diisi");
    } else if (kind === QuestionKind.essay) {
      if (answerKey === "") rowErrors.push("Kunci esai wajib diisi");
    }

    if (rowErrors.length > 0 || kind === null) {
      errors.push({
        number: number || i,
        message: rowErrors.join("; ") || "Baris tidak valid",
      });
      continue;
    }

    const isChoice = kind === QuestionKind.multipleChoice;
    questions.push({
      id: 0n,
      assessmentId: 0n,
      number: BigInt(number),
      kind,
      text,
      optionA: isChoice ? optionA : undefined,
      optionB: isChoice ? optionB : undefined,
      optionC: isChoice ? optionC : undefined,
      optionD: isChoice ? optionD : undefined,
      answerKey,
      weight: BigInt(weight),
    });
  }

  if (questions.length === 0 && errors.length === 0) {
    errors.push({ number: 0, message: "Tidak ada baris soal yang ditemukan" });
  }

  errors.sort((a, b) => a.number - b.number);
  return { questions, errors };
}

/** Build and download the prepared .xlsx template. */
export function downloadTemplate(): void {
  const example = [
    "1",
    "Pilihan Ganda",
    "Ibu kota Indonesia adalah…",
    "Jakarta",
    "Bandung",
    "Surabaya",
    "Medan",
    "A",
    "10",
  ];
  const sheet = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS], example]);
  sheet["!cols"] = [
    { wch: 12 },
    { wch: 16 },
    { wch: 40 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Soal");
  XLSX.writeFile(workbook, "template-soal-nurish-smart.xlsx");
}
