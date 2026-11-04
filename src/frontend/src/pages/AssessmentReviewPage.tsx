import {
  type Answer,
  AttemptStatus,
  type Id,
  QuestionKind,
  type StudentQuestion,
} from "@/backend";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useAssessmentByToken,
  useAssessments,
  useAttempts,
  useFinalizeAttempt,
  useGradeAnswer,
} from "@/hooks/useQueries";
import {
  attemptStatusLabel,
  computeFinalScore,
  educationLevelLabel,
  formatDateTime,
  questionKindLabel,
} from "@/lib/format";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Lock,
  Save,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";

function isManual(kind: QuestionKind): boolean {
  return kind === QuestionKind.shortAnswer || kind === QuestionKind.essay;
}

function statusVariant(status: AttemptStatus) {
  switch (status) {
    case AttemptStatus.graded:
      return "default" as const;
    case AttemptStatus.awaitingReview:
      return "secondary" as const;
    case AttemptStatus.inProgress:
      return "outline" as const;
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function ObjectiveOptions({
  question,
  answer,
}: {
  question: StudentQuestion;
  answer: Answer | undefined;
}) {
  const options = [
    { key: "A", text: question.optionA },
    { key: "B", text: question.optionB },
    { key: "C", text: question.optionC },
    { key: "D", text: question.optionD },
  ].filter((option) => option.text !== undefined);

  if (options.length === 0) return null;

  const selected = (answer?.response ?? "").trim().toUpperCase();

  return (
    <ul className="mt-3 space-y-1.5">
      {options.map((option) => {
        const isSelected = selected === option.key;
        return (
          <li
            key={option.key}
            className={
              isSelected
                ? "flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm text-foreground"
                : "flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
            }
          >
            <span
              className={
                isSelected
                  ? "font-display text-xs font-bold text-primary"
                  : "font-display text-xs font-bold text-muted-foreground"
              }
            >
              {option.key}.
            </span>
            <span className="min-w-0 break-words">{option.text}</span>
            {isSelected && (
              <span className="ml-auto shrink-0 text-xs font-semibold text-primary">
                Dipilih
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ManualGrading({
  attemptId,
  question,
  answer,
  disabled,
}: {
  attemptId: Id;
  question: StudentQuestion;
  answer: Answer | undefined;
  disabled: boolean;
}) {
  const gradeAnswer = useGradeAnswer();
  const [score, setScore] = useState<string>(
    answer?.awardedScore !== undefined ? answer.awardedScore.toString() : "",
  );
  const [comment, setComment] = useState<string>(answer?.mentorComment ?? "");

  const weight = Number(question.weight);
  const parsed = score.trim() === "" ? null : Number(score);
  const scoreValid =
    parsed !== null &&
    Number.isInteger(parsed) &&
    parsed >= 0 &&
    parsed <= weight;

  const handleSave = () => {
    if (!scoreValid || parsed === null) return;
    gradeAnswer.mutate({
      attemptId,
      questionId: question.id,
      awardedScore: BigInt(parsed),
      comment: comment.trim() === "" ? null : comment.trim(),
    });
  };

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/30 p-3.5">
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor={`score-${question.id}`} className="text-xs">
            Nilai (0–{weight})
          </Label>
          <Input
            id={`score-${question.id}`}
            data-ocid={`assessment_review.score_input.${question.number}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={weight}
            step={1}
            value={score}
            disabled={disabled || gradeAnswer.isPending}
            onChange={(event) => setScore(event.target.value)}
            aria-invalid={score.trim() !== "" && !scoreValid}
            className="rounded-lg"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`comment-${question.id}`} className="text-xs">
            Komentar (opsional)
          </Label>
          <Textarea
            id={`comment-${question.id}`}
            data-ocid={`assessment_review.comment_input.${question.number}`}
            rows={2}
            value={comment}
            disabled={disabled || gradeAnswer.isPending}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Catatan untuk jawaban ini…"
            className="rounded-lg"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {score.trim() !== "" && !scoreValid
            ? `Nilai harus bilangan bulat antara 0 dan ${weight}.`
            : `Bobot soal ini ${weight} poin.`}
        </p>
        <Button
          type="button"
          size="sm"
          className="rounded-lg"
          disabled={disabled || !scoreValid || gradeAnswer.isPending}
          onClick={handleSave}
          data-ocid={`assessment_review.save_button.${question.number}`}
        >
          {gradeAnswer.isPending ? (
            <Loader2
              className="mr-1.5 size-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Save className="mr-1.5 size-4" aria-hidden="true" />
          )}
          Simpan Nilai
        </Button>
      </div>
      {gradeAnswer.isError && (
        <p
          role="alert"
          data-ocid={`assessment_review.grade_error.${question.number}`}
          className="text-xs text-destructive"
        >
          Gagal menyimpan nilai. Coba lagi.
        </p>
      )}
    </div>
  );
}

function QuestionCard({
  attemptId,
  question,
  answer,
  locked,
}: {
  attemptId: Id;
  question: StudentQuestion;
  answer: Answer | undefined;
  locked: boolean;
}) {
  const manual = isManual(question.kind);
  const response = answer?.response ?? "";
  const answered = response.trim() !== "";

  return (
    <Card
      data-ocid={`assessment_review.question_card.${question.number}`}
      className="rounded-2xl border-border shadow-subtle"
    >
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-secondary font-display text-xs font-bold text-secondary-foreground">
            {question.number.toString()}
          </span>
          <Badge variant="outline" className="rounded-full">
            {questionKindLabel(question.kind)}
          </Badge>
          <Badge variant="secondary" className="rounded-full">
            Bobot {question.weight.toString()}
          </Badge>
          {!answered && (
            <Badge
              variant="outline"
              className="rounded-full text-muted-foreground"
            >
              Tidak dijawab
            </Badge>
          )}
        </div>
        <CardTitle className="font-display text-base font-semibold leading-snug text-foreground">
          {question.text}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {question.kind === QuestionKind.multipleChoice ||
        question.kind === QuestionKind.trueFalse ? (
          <ObjectiveOptions question={question} answer={answer} />
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 p-3.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Jawaban siswa
            </p>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-foreground">
              {answered ? response : "—"}
            </p>
          </div>
        )}

        {!manual && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            <span className="text-muted-foreground">Nilai otomatis:</span>
            <span className="font-display font-bold text-foreground">
              {answer?.awardedScore !== undefined
                ? answer.awardedScore.toString()
                : "0"}
            </span>
            <span className="text-muted-foreground">
              / {question.weight.toString()}
            </span>
          </div>
        )}

        {manual && (
          <ManualGrading
            attemptId={attemptId}
            question={question}
            answer={answer}
            disabled={locked}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function AssessmentReviewPage() {
  const { assessmentId, attemptId } = useParams({
    from: "/staff/assessments/$assessmentId/attempts/$attemptId",
  });

  const parsedAssessmentId = useMemo<Id | null>(() => {
    try {
      return BigInt(assessmentId);
    } catch {
      return null;
    }
  }, [assessmentId]);

  const parsedAttemptId = useMemo<Id | null>(() => {
    try {
      return BigInt(attemptId);
    } catch {
      return null;
    }
  }, [attemptId]);

  const {
    data: assessments,
    isLoading: assessmentsLoading,
    isError: assessmentsError,
  } = useAssessments();
  const assessment = useMemo(
    () =>
      (assessments ?? []).find(
        (item) => parsedAssessmentId !== null && item.id === parsedAssessmentId,
      ) ?? null,
    [assessments, parsedAssessmentId],
  );

  const {
    data: tokenData,
    isLoading: questionsLoading,
    isError: questionsError,
  } = useAssessmentByToken(assessment?.shareToken ?? "");
  const questions = useMemo<StudentQuestion[]>(
    () => tokenData?.[1] ?? [],
    [tokenData],
  );

  const {
    data: attempts,
    isLoading: attemptsLoading,
    isError: attemptsError,
  } = useAttempts(parsedAssessmentId);
  const attempt = useMemo(
    () =>
      (attempts ?? []).find(
        (item) => parsedAttemptId !== null && item.id === parsedAttemptId,
      ) ?? null,
    [attempts, parsedAttemptId],
  );

  const finalizeAttempt = useFinalizeAttempt();
  const [mentorNote, setMentorNote] = useState<string>("");
  const [noteInitialized, setNoteInitialized] = useState(false);

  if (attempt && !noteInitialized) {
    setMentorNote(attempt.mentorNote ?? "");
    setNoteInitialized(true);
  }

  const answerByQuestion = useMemo(() => {
    const map = new Map<string, Answer>();
    for (const answer of attempt?.answers ?? []) {
      map.set(answer.questionId.toString(), answer);
    }
    return map;
  }, [attempt]);

  const manualQuestions = useMemo(
    () => questions.filter((question) => isManual(question.kind)),
    [questions],
  );

  const allManualGraded = manualQuestions.every((question) => {
    const answer = answerByQuestion.get(question.id.toString());
    // Unanswered manual questions have nothing to grade; only answered ones
    // must carry a score, matching the backend's finalize precondition.
    if (answer === undefined || answer.response.trim() === "") return true;
    return answer.awardedScore !== undefined;
  });

  const totalWeight = useMemo(
    () => questions.reduce((sum, question) => sum + question.weight, 0n),
    [questions],
  );

  const earned = useMemo(
    () =>
      questions.reduce((sum, question) => {
        const answer = answerByQuestion.get(question.id.toString());
        return sum + (answer?.awardedScore ?? 0n);
      }, 0n),
    [questions, answerByQuestion],
  );

  const isLoading = assessmentsLoading || questionsLoading || attemptsLoading;
  const isError = assessmentsError || questionsError || attemptsError;

  const locked = attempt?.status === AttemptStatus.graded;
  const canFinalize =
    attempt?.status === AttemptStatus.awaitingReview &&
    allManualGraded &&
    !finalizeAttempt.isPending;

  const handleFinalize = () => {
    if (!attempt) return;
    finalizeAttempt.mutate({
      attemptId: attempt.id,
      mentorNote: mentorNote.trim() === "" ? null : mentorNote.trim(),
    });
  };

  const backLink = assessment ? (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="rounded-lg text-primary"
    >
      <Link
        to="/assessments/$assessmentId/results"
        params={{ assessmentId: assessmentId }}
        data-ocid="assessment_review.back_link"
      >
        <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
        Kembali ke Hasil
      </Link>
    </Button>
  ) : null;

  if (isError) {
    return (
      <section data-ocid="assessment_review.page" className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Pemeriksaan Jawaban
          </h1>
        </header>
        <div
          data-ocid="assessment_review.error_state"
          className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive"
        >
          Gagal memuat lembar jawaban. Muat ulang halaman untuk mencoba lagi.
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section data-ocid="assessment_review.page" className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Pemeriksaan Jawaban
          </h1>
          <p className="text-sm text-muted-foreground">
            Nilai jawaban isian singkat dan esai siswa.
          </p>
        </header>
        <div data-ocid="assessment_review.loading_state" className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          {Array.from({ length: 3 }, (_, i) => `review-skeleton-${i}`).map(
            (id) => (
              <Skeleton key={id} className="h-40 rounded-2xl" />
            ),
          )}
        </div>
      </section>
    );
  }

  if (!attempt || !assessment) {
    return (
      <section data-ocid="assessment_review.page" className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Pemeriksaan Jawaban
          </h1>
        </header>
        <div
          data-ocid="assessment_review.empty_state"
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center shadow-subtle"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <ClipboardCheck className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="font-display text-base font-semibold text-foreground">
              Lembar jawaban tidak ditemukan
            </p>
            <p className="text-sm text-muted-foreground">
              Pengerjaan ini tidak tersedia atau bukan milik asesmen Anda.
            </p>
          </div>
          <Button asChild className="rounded-lg">
            <Link to="/assessments" data-ocid="assessment_review.empty_cta">
              Kembali ke Daftar Asesmen
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  const finalScore = computeFinalScore(earned, totalWeight);

  return (
    <section data-ocid="assessment_review.page" className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Pemeriksaan Jawaban
          </h1>
          <p className="text-sm text-muted-foreground">
            Nilai jawaban isian singkat dan esai, lalu finalisasi hasil.
          </p>
        </div>
        {backLink}
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border shadow-subtle">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle className="font-display text-base">
                Identitas Siswa
              </CardTitle>
              <CardDescription>
                Pengerjaan ke-{attempt.attemptNumber.toString()}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow label="Nama Lengkap" value={attempt.student.fullName} />
              <InfoRow
                label="Nomor Identitas"
                value={attempt.student.participantId}
              />
              <InfoRow
                label="Jenjang"
                value={educationLevelLabel(attempt.student.educationLevel)}
              />
              <InfoRow label="Kelas" value={attempt.student.className} />
              <InfoRow label="Sekolah" value={attempt.student.schoolName} />
            </dl>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <div className="min-w-0">
              <CardTitle className="font-display text-base">
                Informasi Asesmen
              </CardTitle>
              <CardDescription className="truncate">
                {assessment.title}
              </CardDescription>
            </div>
            <Badge
              variant={statusVariant(attempt.status)}
              className="shrink-0 rounded-full"
            >
              {attemptStatusLabel(attempt.status)}
            </Badge>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow label="Mata Pelajaran" value={assessment.subject} />
              <InfoRow label="Materi" value={assessment.material} />
              <InfoRow
                label="Jenjang"
                value={educationLevelLabel(assessment.educationLevel)}
              />
              <InfoRow label="Kelas" value={assessment.className} />
              <InfoRow
                label="Dikumpulkan"
                value={
                  attempt.submittedAt !== undefined
                    ? formatDateTime(attempt.submittedAt)
                    : "—"
                }
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Daftar Soal &amp; Jawaban
          </h2>
          <span className="text-sm text-muted-foreground">
            {questions.length} soal
          </span>
        </div>
        {questions.length === 0 ? (
          <div
            data-ocid="assessment_review.questions_empty_state"
            className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground shadow-subtle"
          >
            Asesmen ini belum memiliki soal.
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <QuestionCard
                key={question.id.toString()}
                attemptId={attempt.id}
                question={question}
                answer={answerByQuestion.get(question.id.toString())}
                locked={locked}
              />
            ))}
          </div>
        )}
      </div>

      <Card className="rounded-2xl border-border shadow-subtle">
        <CardHeader className="space-y-1">
          <CardTitle className="font-display text-lg">
            Catatan &amp; Rekomendasi Mentor
          </CardTitle>
          <CardDescription>
            Tambahkan catatan untuk siswa sebelum menutup penilaian.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mentor-note" className="text-xs">
              Catatan dan rekomendasi
            </Label>
            <Textarea
              id="mentor-note"
              data-ocid="assessment_review.note_input"
              rows={4}
              value={mentorNote}
              disabled={locked || finalizeAttempt.isPending}
              onChange={(event) => setMentorNote(event.target.value)}
              placeholder="Tuliskan catatan, saran belajar, atau rekomendasi untuk siswa…"
              className="rounded-lg"
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Nilai Akhir Sementara
              </p>
              <p className="font-display text-2xl font-bold text-foreground">
                {finalScore.toFixed(1)}
                <span className="ml-1 text-sm font-medium text-muted-foreground">
                  / 100
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {earned.toString()} dari {totalWeight.toString()} poin
              </p>
            </div>

            {locked ? (
              <div
                data-ocid="assessment_review.finalized_state"
                className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm font-medium text-foreground"
              >
                <Lock className="size-4 text-primary" aria-hidden="true" />
                Penilaian sudah difinalisasi
              </div>
            ) : (
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <Button
                  type="button"
                  className="rounded-lg"
                  disabled={!canFinalize}
                  onClick={handleFinalize}
                  data-ocid="assessment_review.finalize_button"
                >
                  {finalizeAttempt.isPending ? (
                    <Loader2
                      className="mr-1.5 size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ClipboardCheck
                      className="mr-1.5 size-4"
                      aria-hidden="true"
                    />
                  )}
                  Finalisasi Penilaian
                </Button>
                {!allManualGraded && (
                  <p className="text-xs text-muted-foreground sm:text-right">
                    Nilai semua jawaban isian singkat dan esai terlebih dahulu.
                  </p>
                )}
                {finalizeAttempt.isError && (
                  <p
                    role="alert"
                    data-ocid="assessment_review.finalize_error"
                    className="text-xs text-destructive sm:text-right"
                  >
                    Gagal memfinalisasi. Pastikan semua jawaban manual sudah
                    dinilai.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
