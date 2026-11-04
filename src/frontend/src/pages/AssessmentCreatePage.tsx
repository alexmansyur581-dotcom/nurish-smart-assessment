import { EducationLevel } from "@/backend";
import type { AssessmentView, Question } from "@/backend";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateAssessment,
  usePublishAssessment,
  useUploadQuestions,
} from "@/hooks/useQueries";
import { educationLevelLabel, questionKindLabel } from "@/lib/format";
import {
  type RowError,
  downloadTemplate,
  parseQuestionsWorkbook,
} from "@/lib/question-import";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";

type Step = "form" | "preview" | "published";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function AssessmentCreatePage() {
  const createAssessment = useCreateAssessment();
  const uploadQuestions = useUploadQuestions();
  const publishAssessment = usePublishAssessment();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("form");
  const [title, setTitle] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(
    EducationLevel.sdMi,
  );
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [material, setMaterial] = useState("");
  const [allowedAttempts, setAllowedAttempts] = useState("1");

  const [fileName, setFileName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [parseError, setParseError] = useState("");

  const [assessment, setAssessment] = useState<AssessmentView | null>(null);
  const [shareToken, setShareToken] = useState("");
  const [copied, setCopied] = useState(false);

  const attemptsNumber = Number.parseInt(allowedAttempts, 10);
  const attemptsValid = Number.isFinite(attemptsNumber) && attemptsNumber >= 1;
  const formValid =
    title.trim() !== "" &&
    className.trim() !== "" &&
    subject.trim() !== "" &&
    material.trim() !== "" &&
    attemptsValid;

  const shareUrl =
    shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/exam/${shareToken}`
      : "";

  function resetParsed() {
    setQuestions([]);
    setRowErrors([]);
    setParseError("");
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setParseError("");
    setRowErrors([]);
    setQuestions([]);

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setFileName(file.name);
      setParseError("Berkas harus berformat .xlsx");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileName(file.name);
      setParseError("Ukuran berkas melebihi 5 MB");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const result = parseQuestionsWorkbook(buffer);
      setFileName(file.name);
      setQuestions(result.questions);
      setRowErrors(result.errors);
      if (result.errors.length > 0) {
        toast.error(
          `${result.errors.length} baris perlu diperbaiki sebelum disimpan.`,
        );
      } else {
        toast.success(`${result.questions.length} soal berhasil dibaca.`);
      }
    } catch {
      setFileName(file.name);
      setParseError("Berkas tidak dapat dibaca. Pastikan format .xlsx benar.");
    }
  }

  async function handlePreview() {
    if (!formValid) {
      toast.error("Lengkapi informasi asesmen terlebih dahulu.");
      return;
    }
    if (questions.length === 0) {
      toast.error("Unggah berkas soal yang valid terlebih dahulu.");
      return;
    }
    if (rowErrors.length > 0) {
      toast.error("Perbaiki kesalahan pada berkas soal terlebih dahulu.");
      return;
    }

    try {
      const created = await createAssessment.mutateAsync({
        title: title.trim(),
        educationLevel,
        className: className.trim(),
        subject: subject.trim(),
        material: material.trim(),
        allowedAttempts: BigInt(attemptsNumber),
      });
      await uploadQuestions.mutateAsync({
        assessmentId: created.id,
        parsed: questions,
      });
      setAssessment(created);
      setStep("preview");
      toast.success("Soal tersimpan. Tinjau sebelum menerbitkan.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan asesmen. Coba lagi.",
      );
    }
  }

  async function handlePublish() {
    if (!assessment) return;
    try {
      const token = await publishAssessment.mutateAsync(assessment.id);
      if (!token) {
        toast.error("Asesmen tidak dapat diterbitkan.");
        return;
      }
      setShareToken(token);
      setStep("published");
      toast.success("Asesmen berhasil diterbitkan.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal menerbitkan asesmen. Coba lagi.",
      );
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Tautan disalin ke papan klip.");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Tidak dapat menyalin otomatis. Salin tautan secara manual.");
    }
  }

  const saving = createAssessment.isPending || uploadQuestions.isPending;

  return (
    <section data-ocid="assessment_create.page" className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Buat Asesmen
        </h1>
        <p className="text-sm text-muted-foreground">
          Susun asesmen baru, unggah soal dari berkas Excel, lalu terbitkan
          tautan untuk siswa.
        </p>
      </header>

      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium">
        {(
          [
            ["form", "1. Informasi & Soal"],
            ["preview", "2. Pratinjau"],
            ["published", "3. Terbit"],
          ] as const
        ).map(([key, label]) => {
          const order: Step[] = ["form", "preview", "published"];
          const active = step === key;
          const done = order.indexOf(step) > order.indexOf(key);
          return (
            <li
              key={key}
              className={
                active
                  ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
                  : done
                    ? "rounded-full bg-success/15 px-3 py-1 text-success"
                    : "rounded-full bg-muted px-3 py-1 text-muted-foreground"
              }
            >
              {label}
            </li>
          );
        })}
      </ol>

      {step === "form" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Informasi Asesmen
              </CardTitle>
              <CardDescription>
                Isi detail asesmen yang akan dikerjakan siswa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assessment-title">Judul asesmen</Label>
                <Input
                  id="assessment-title"
                  data-ocid="assessment_create.title_input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Contoh: Ulangan Harian Matematika Bab Pecahan"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assessment-level">Jenjang</Label>
                  <Select
                    value={educationLevel}
                    onValueChange={(value) =>
                      setEducationLevel(value as EducationLevel)
                    }
                  >
                    <SelectTrigger
                      id="assessment-level"
                      data-ocid="assessment_create.level_select"
                      className="w-full"
                    >
                      <SelectValue placeholder="Pilih jenjang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EducationLevel.sdMi}>SD/MI</SelectItem>
                      <SelectItem value={EducationLevel.smpMts}>
                        SMP/MTs
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessment-class">Kelas</Label>
                  <Input
                    id="assessment-class"
                    data-ocid="assessment_create.class_input"
                    value={className}
                    onChange={(event) => setClassName(event.target.value)}
                    placeholder="Contoh: 5A"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assessment-subject">Mata pelajaran</Label>
                  <Input
                    id="assessment-subject"
                    data-ocid="assessment_create.subject_input"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Contoh: Matematika"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessment-attempts">
                    Jumlah kesempatan mengerjakan
                  </Label>
                  <Input
                    id="assessment-attempts"
                    data-ocid="assessment_create.attempts_input"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={allowedAttempts}
                    onChange={(event) => setAllowedAttempts(event.target.value)}
                  />
                  {!attemptsValid && (
                    <p
                      data-ocid="assessment_create.attempts_error"
                      className="text-xs text-destructive"
                    >
                      Minimal 1 kesempatan.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assessment-material">Materi</Label>
                <Input
                  id="assessment-material"
                  data-ocid="assessment_create.material_input"
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                  placeholder="Contoh: Operasi pecahan sederhana"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Berkas Soal
              </CardTitle>
              <CardDescription>
                Unduh template, isi soal, lalu unggah kembali berkas .xlsx.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                variant="outline"
                data-ocid="assessment_create.download_template_button"
                className="w-full"
                onClick={() => {
                  downloadTemplate();
                  toast.success("Template soal diunduh.");
                }}
              >
                <Download className="size-4" aria-hidden="true" />
                Unduh Template Excel
              </Button>

              <div className="rounded-xl border border-dashed border-input bg-muted/40 p-4">
                <input
                  ref={fileInputRef}
                  id="assessment-file"
                  data-ocid="assessment_create.file_input"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="assessment-file"
                  data-ocid="assessment_create.upload_button"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg px-3 py-4 text-center transition-smooth hover:bg-muted focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
                >
                  <Upload className="size-6 text-primary" aria-hidden="true" />
                  <span className="text-sm font-medium text-foreground">
                    Pilih berkas .xlsx
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Maksimal 5 MB
                  </span>
                </label>
              </div>

              {fileName && (
                <div
                  data-ocid="assessment_create.file_status"
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <FileSpreadsheet
                    className="size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {fileName}
                  </span>
                  {questions.length > 0 && rowErrors.length === 0 && (
                    <span className="shrink-0 text-xs font-medium text-success">
                      {questions.length} soal
                    </span>
                  )}
                </div>
              )}

              {parseError && (
                <p
                  data-ocid="assessment_create.parse_error"
                  className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  <AlertCircle
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {parseError}
                </p>
              )}

              {rowErrors.length > 0 && (
                <div
                  data-ocid="assessment_create.validation_errors"
                  className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <AlertCircle className="size-4" aria-hidden="true" />
                    {rowErrors.length} baris tidak valid
                  </p>
                  <ul className="space-y-1 text-xs text-destructive">
                    {rowErrors.map((error) => (
                      <li key={`${error.number}-${error.message}`}>
                        <span className="font-semibold">
                          Soal {error.number || "?"}:
                        </span>{" "}
                        {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {questions.length > 0 && rowErrors.length === 0 && (
                <p
                  data-ocid="assessment_create.valid_state"
                  className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
                >
                  <CheckCircle2
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  Semua {questions.length} soal valid dan siap disimpan.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-5">
            <Button
              type="button"
              data-ocid="assessment_create.preview_button"
              className="w-full sm:w-auto"
              disabled={!formValid || questions.length === 0 || saving}
              onClick={handlePreview}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {saving ? "Menyimpan…" : "Simpan & Pratinjau Soal"}
            </Button>
          </div>
        </div>
      )}

      {step === "preview" && assessment && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Pratinjau Soal
              </CardTitle>
              <CardDescription>
                {assessment.title} ·{" "}
                {educationLevelLabel(assessment.educationLevel)} · Kelas{" "}
                {assessment.className} · {assessment.subject}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {questions.map((question) => (
                <article
                  key={question.number.toString()}
                  data-ocid={`assessment_create.preview_item.${question.number}`}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground">
                      {question.number.toString()}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {questionKindLabel(question.kind)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Bobot {question.weight.toString()}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                    {question.text}
                  </p>
                  {question.kind === "multipleChoice" && (
                    <ul className="mt-3 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                      {(
                        [
                          ["A", question.optionA],
                          ["B", question.optionB],
                          ["C", question.optionC],
                          ["D", question.optionD],
                        ] as const
                      ).map(([letter, option]) => (
                        <li key={letter} className="flex gap-2">
                          <span className="font-semibold text-foreground">
                            {letter}.
                          </span>
                          <span className="min-w-0 break-words">
                            {option ?? "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Kunci:
                    </span>{" "}
                    {question.answerKey}
                  </p>
                </article>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              data-ocid="assessment_create.publish_button"
              disabled={publishAssessment.isPending}
              onClick={handlePublish}
            >
              {publishAssessment.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {publishAssessment.isPending
                ? "Menerbitkan…"
                : "Terbitkan Asesmen"}
            </Button>
            <Button
              type="button"
              variant="outline"
              data-ocid="assessment_create.back_button"
              onClick={() => setStep("form")}
            >
              Kembali ke Formulir
            </Button>
          </div>
        </div>
      )}

      {step === "published" && (
        <Card data-ocid="assessment_create.success_state">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <CheckCircle2
                className="size-5 text-success"
                aria-hidden="true"
              />
              Asesmen Terbit
            </CardTitle>
            <CardDescription>
              Bagikan tautan berikut kepada siswa secara manual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-link">Tautan asesmen</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="share-link"
                  data-ocid="assessment_create.share_link_input"
                  readOnly
                  value={shareUrl}
                  onFocus={(event) => event.target.select()}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  data-ocid="assessment_create.copy_button"
                  className="shrink-0"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                  {copied ? "Tersalin" : "Salin"}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" asChild>
                <Link
                  to="/assessments"
                  data-ocid="assessment_create.view_list_link"
                >
                  Lihat Daftar Asesmen
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                data-ocid="assessment_create.create_another_button"
                onClick={() => {
                  setStep("form");
                  setTitle("");
                  setClassName("");
                  setSubject("");
                  setMaterial("");
                  setAllowedAttempts("1");
                  setAssessment(null);
                  setShareToken("");
                  setCopied(false);
                  resetParsed();
                }}
              >
                Buat Asesmen Lain
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
